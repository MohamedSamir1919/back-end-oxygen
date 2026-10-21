import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticateToken, authorizeRoles } from '../middleware/auth.js'
import Order from '../models/Order.js'

const router = Router()

router.get('/', authenticateToken, authorizeRoles('driver'), (request, response) => {
  response.json({ message: 'تم التحقق من صلاحية المندوب', user: request.staff })
})

router.get('/orders', authenticateToken, authorizeRoles('driver'), async (request, response) => {
  const orders = await Order.find({ assignedDriver: request.staff.id }).sort({ createdAt: -1 })
  return response.json({ orders })
})

router.patch('/orders/:orderId/status', authenticateToken, authorizeRoles('driver'), async (request, response) => {
  const { status } = request.body || {}
  if (!mongoose.isValidObjectId(request.params.orderId) || !['picked_up', 'delivered'].includes(status)) {
    return response.status(400).json({ message: 'الحالة المطلوبة غير صالحة' })
  }
  const order = await Order.findOne({ _id: request.params.orderId, assignedDriver: request.staff.id })
  if (!order) return response.status(404).json({ message: 'الطلب غير موجود ضمن مهامك' })
  if ((status === 'picked_up' && order.status !== 'assigned') || (status === 'delivered' && order.status !== 'ready_for_delivery')) {
    return response.status(409).json({ message: 'لا يمكن تحديث الطلب بهذه الحالة الآن' })
  }

  order.status = status
  if (status === 'picked_up') order.pickedUpAt = new Date()
  if (status === 'delivered') order.deliveredAt = new Date()
  order.statusHistory.push({ status, changedBy: request.staff.username })
  await order.save()
  return response.json({ order })
})

export default router