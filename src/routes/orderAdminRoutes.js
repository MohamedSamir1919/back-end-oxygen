import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticateToken, authorizeRoles } from '../middleware/auth.js'
import Order from '../models/Order.js'
import StaffUser from '../models/StaffUser.js'

const router = Router()
const allowedStatuses = ['processing', 'ready_for_delivery']

router.get('/', authenticateToken, authorizeRoles('admin'), async (_request, response) => {
  const orders = await Order.find().sort({ createdAt: -1 }).populate('assignedDriver', 'displayName username phone')
  return response.json({ orders })
})

router.get('/drivers', authenticateToken, authorizeRoles('admin'), async (_request, response) => {
  const drivers = await StaffUser.find({ role: 'driver', active: true }).select('displayName username phone').sort({ displayName: 1 })
  return response.json({ drivers })
})

router.patch('/:orderId/assign', authenticateToken, authorizeRoles('admin'), async (request, response) => {
  const { driverId } = request.body || {}
  if (!mongoose.isValidObjectId(request.params.orderId) || !mongoose.isValidObjectId(driverId)) {
    return response.status(400).json({ message: 'اختر طلبًا ومندوبًا صالحين' })
  }
  const driver = await StaffUser.findOne({ _id: driverId, role: 'driver', active: true })
  if (!driver) return response.status(404).json({ message: 'المندوب غير موجود أو غير نشط' })

  const order = await Order.findById(request.params.orderId)
  if (!order) return response.status(404).json({ message: 'الطلب غير موجود' })
  order.assignedDriver = driver.id
  if (order.status === 'confirmed') order.status = 'assigned'
  order.statusHistory.push({ status: order.status, changedBy: request.staff.username })
  await order.save()
  await order.populate('assignedDriver', 'displayName username phone')
  return response.json({ order })
})

router.patch('/:orderId/status', authenticateToken, authorizeRoles('admin'), async (request, response) => {
  const { status } = request.body || {}
  if (!mongoose.isValidObjectId(request.params.orderId) || !allowedStatuses.includes(status)) {
    return response.status(400).json({ message: 'الحالة المطلوبة غير صالحة' })
  }
  const order = await Order.findById(request.params.orderId)
  if (!order) return response.status(404).json({ message: 'الطلب غير موجود' })
  order.status = status
  order.statusHistory.push({ status, changedBy: request.staff.username })
  await order.save()
  await order.populate('assignedDriver', 'displayName username phone')
  return response.json({ order })
})

export default router