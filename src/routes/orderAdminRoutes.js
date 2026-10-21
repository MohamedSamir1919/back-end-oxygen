import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticateToken, authorizeRoles } from '../middleware/auth.js'
import Order from '../models/Order.js'
import StaffUser from '../models/StaffUser.js'

const router = Router()
const allowedStatuses = ['ready_for_delivery']

router.get('/', authenticateToken, authorizeRoles('admin'), async (_request, response) => {
  const orders = await Order.find().sort({ createdAt: -1 })
    .populate('pickupDriver', 'displayName username phone')
    .populate('deliveryDriver', 'displayName username phone')
    .populate('assignedDriver', 'displayName username phone')
  return response.json({ orders })
})

router.get('/drivers', authenticateToken, authorizeRoles('admin'), async (_request, response) => {
  const drivers = await StaffUser.find({ role: 'driver', active: true }).select('displayName username phone').sort({ displayName: 1 })
  return response.json({ drivers })
})

router.patch('/:orderId/assign', authenticateToken, authorizeRoles('admin'), async (request, response) => {
  const { driverId, phase } = request.body || {}
  if (!mongoose.isValidObjectId(request.params.orderId) || !mongoose.isValidObjectId(driverId) || !['pickup', 'delivery'].includes(phase)) {
    return response.status(400).json({ message: 'اختر طلبًا ومندوبًا صالحين' })
  }
  const driver = await StaffUser.findOne({ _id: driverId, role: 'driver', active: true })
  if (!driver) return response.status(404).json({ message: 'المندوب غير موجود أو غير نشط' })

  const order = await Order.findById(request.params.orderId)
  if (!order) return response.status(404).json({ message: 'الطلب غير موجود' })
  if (phase === 'pickup') {
    if (!['confirmed', 'assigned'].includes(order.status)) {
      return response.status(409).json({ message: 'لا يمكن تغيير مندوب الاستلام بعد استلام الطلب' })
    }
    order.pickupDriver = driver.id
    order.assignedDriver = driver.id
    order.status = 'assigned'
  } else {
    if (order.status === 'delivered') {
      return response.status(409).json({ message: 'لا يمكن تغيير مندوب طلب تم تسليمه' })
    }
    if (!order.pickupDriver && order.assignedDriver) order.pickupDriver = order.assignedDriver
    order.deliveryDriver = driver.id
    order.assignedDriver = driver.id
  }
  order.statusHistory.push({ status: order.status, changedBy: request.staff.username })
  await order.save()
  await order.populate('pickupDriver deliveryDriver assignedDriver', 'displayName username phone')
  return response.json({ order })
})

router.patch('/:orderId/status', authenticateToken, authorizeRoles('admin'), async (request, response) => {
  const { status } = request.body || {}
  if (!mongoose.isValidObjectId(request.params.orderId) || !allowedStatuses.includes(status)) {
    return response.status(400).json({ message: 'الحالة المطلوبة غير صالحة' })
  }
  const order = await Order.findById(request.params.orderId)
  if (!order) return response.status(404).json({ message: 'الطلب غير موجود' })
  if (status !== 'ready_for_delivery' || order.status !== 'processing') {
    return response.status(409).json({ message: 'يمكن تجهيز الطلب للتسليم بعد وصوله للمغسلة وبدء تجهيزه' })
  }
  if (!order.deliveryDriver) {
    return response.status(409).json({ message: 'اختر مندوب التسليم أولاً' })
  }
  order.status = status
  order.statusHistory.push({ status, changedBy: request.staff.username })
  await order.save()
  await order.populate('pickupDriver deliveryDriver assignedDriver', 'displayName username phone')
  return response.json({ order })
})

export default router