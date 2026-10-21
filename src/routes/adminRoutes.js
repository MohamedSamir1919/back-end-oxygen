import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { authenticateToken, authorizeRoles } from '../middleware/auth.js'
import StaffUser from '../models/StaffUser.js'

const router = Router()

router.get('/', authenticateToken, authorizeRoles('admin'), (request, response) => {
  response.json({ message: 'تم التحقق من صلاحية الإدارة', user: request.staff })
})

router.post('/staff', authenticateToken, authorizeRoles('admin'), async (request, response) => {
  const { username, password, role, displayName, phone } = request.body || {}
  if (typeof username !== 'string' || typeof password !== 'string') {
    return response.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان' })
  }

  const normalizedUsername = username.trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
    return response.status(400).json({ message: 'اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا' })
  }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ message: 'كلمة المرور يجب أن تكون 12 حرفًا على الأقل وبحد أقصى 72 بايت' })
  }
  if (!['admin', 'driver'].includes(role)) {
    return response.status(400).json({ message: 'اختر دورًا صحيحًا للحساب' })
  }
  if (role === 'driver' && (typeof displayName !== 'string' || !displayName.trim() || typeof phone !== 'string' || !/^[0-9+ ]{10,15}$/.test(phone.trim()))) {
    return response.status(400).json({ message: 'اسم المندوب ورقم هاتف صحيح مطلوبان' })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const staff = await StaffUser.create({ username: normalizedUsername, passwordHash, role, displayName: displayName?.trim() || '', phone: phone?.trim() || '' })
    return response.status(201).json({
      message: 'تم إنشاء حساب الموظف بنجاح',
      user: { id: staff.id, username: staff.username, displayName: staff.displayName, phone: staff.phone, role: staff.role },
    })
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'اسم المستخدم مستخدم بالفعل' })
    }
    throw error
  }
})

export default router