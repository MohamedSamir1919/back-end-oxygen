import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticateToken, authorizeRoles } from '../middleware/auth.js'
import Order from '../models/Order.js'

const router = Router()

router.get('/', authenticateToken, authorizeRoles('driver'), (request, response) => {
  response.json({ message: 'تم التحقق من صلاحية المندوب', user: request.staff })
})

router.get('/orders', authenticateToken, authorizeRoles('driver'), async (request, response) => {
  const orders = await Order.find({
    $or: [
      { pickupDriver: request.staff.id, status: { $in: ['assigned', 'picked_up', 'processing'] } },
      { deliveryDriver: request.staff.id, status: { $in: ['processing', 'ready_for_delivery', 'delivered'] } },
      { pickupDriver: null, deliveryDriver: null, assignedDriver: request.staff.id, status: { $in: ['assigned', 'picked_up', 'processing', 'ready_for_delivery', 'delivered'] } },
    ],
  }).sort({ createdAt: -1 })
  return response.json({ orders })
})

router.patch('/orders/:orderId/status', authenticateToken, authorizeRoles('driver'), async (request, response) => {
  const { status } = request.body || {}
  if (!mongoose.isValidObjectId(request.params.orderId) || !['picked_up', 'processing', 'delivered'].includes(status)) {
    return response.status(400).json({ message: 'الحالة المطلوبة غير صالحة' })
  }
  const order = await Order.findById(request.params.orderId)
  if (!order) return response.status(404).json({ message: 'الطلب غير موجود' })

  const pickupDriverId = order.pickupDriver?.toString() || order.assignedDriver?.toString()
  const deliveryDriverId = order.deliveryDriver?.toString() || order.assignedDriver?.toString()
  const isPickupDriver = pickupDriverId === request.staff.id
  const isDeliveryDriver = deliveryDriverId === request.staff.id
  const canUpdate = (status === 'picked_up' && order.status === 'assigned' && isPickupDriver)
    || (status === 'processing' && order.status === 'picked_up' && isPickupDriver)
    || (status === 'delivered' && order.status === 'ready_for_delivery' && isDeliveryDriver)
  if (!canUpdate) {
    if (!isPickupDriver && !isDeliveryDriver) return response.status(403).json({ message: 'هذا الطلب غير مسند إليك في هذه المرحلة' })
    return response.status(409).json({ message: 'لا يمكن تحديث الطلب بهذه الحالة الآن' })
  }

  order.status = status
  if (status === 'picked_up') order.pickedUpAt = new Date()
  if (status === 'processing') order.statusHistory.push({ status, changedBy: request.staff.username })
  if (status === 'delivered') order.deliveredAt = new Date()
  if (status !== 'processing') order.statusHistory.push({ status, changedBy: request.staff.username })
  await order.save()
  return response.json({ order })
})

export default router