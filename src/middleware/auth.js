import jwt from 'jsonwebtoken'
import StaffUser from '../models/StaffUser.js'

export async function authenticateToken(request, response, next) {
  const authorization = request.headers.authorization
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!token) return response.status(401).json({ message: 'يجب تسجيل الدخول أولاً' })

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return response.status(401).json({ message: 'الجلسة غير صالحة أو انتهت' })
  }

  const staff = await StaffUser.findById(payload.sub).select('username displayName phone role active')
  if (!staff?.active || staff.role !== payload.role) {
    return response.status(401).json({ message: 'الجلسة غير صالحة' })
  }
  request.staff = { id: staff.id, username: staff.username, displayName: staff.displayName, phone: staff.phone, role: staff.role }
  return next()
}

export function authorizeRoles(...roles) {
  return (request, response, next) => {
    if (!request.staff || !roles.includes(request.staff.role)) {
      return response.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى هذا المورد' })
    }
    return next()
  }
}