import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import StaffUser from '../models/StaffUser.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'محاولات كثيرة، حاول مرة أخرى بعد قليل' },
})

router.post('/login', loginLimit, async (request, response) => {
  const username = String(request.body.username || '').trim().toLowerCase()
  const password = request.body.password
  if (!username || typeof password !== 'string') {
    return response.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان' })
  }

  const staff = await StaffUser.findOne({ username }).select('+passwordHash')
  const passwordMatches = staff && await bcrypt.compare(password, staff.passwordHash)
  if (!staff?.active || !passwordMatches) {
    return response.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' })
  }

  const token = jwt.sign(
    { role: staff.role },
    process.env.JWT_SECRET,
    { subject: staff.id, expiresIn: process.env.JWT_EXPIRES_IN || '8h', algorithm: 'HS256' },
  )
  return response.json({
    token,
    user: { id: staff.id, username: staff.username, displayName: staff.displayName, phone: staff.phone, role: staff.role },
  })
})

router.get('/me', authenticateToken, (request, response) => {
  response.json({ user: request.staff })
})

export default router