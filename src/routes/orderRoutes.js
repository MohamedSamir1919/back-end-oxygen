import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Item from '../models/Item.js'
import Service from '../models/Service.js'
import ItemServicePrice from '../models/ItemServicePrice.js'
import { ensureItemServicePrices } from '../services/itemServicePrices.js'

const router = Router()

const expectedDeliveryHours = { '48': 48, '72': 72, '6': 6 }

router.post('/', async (request, response) => {
  const { customer, items, extras, paymentMethod, pickupWindow, deliveryHours } = request.body || {}
  if (!customer || typeof customer.name !== 'string' || customer.name.trim().length < 2 || customer.name.trim().length > 100
    || typeof customer.phone !== 'string' || !/^[0-9+ ]{10,15}$/.test(customer.phone.trim())
    || typeof customer.address !== 'string' || customer.address.trim().length < 5 || customer.address.trim().length > 300) {
    return response.status(400).json({ message: 'اسم العميل ورقم الهاتف والعنوان مطلوبون' })
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return response.status(400).json({ message: 'أضف قطعة واحدة على الأقل للطلب' })
  }
  if (!items.every((item) => mongoose.isValidObjectId(item.itemId) && mongoose.isValidObjectId(item.serviceId)
    && Number.isInteger(item.quantity) && item.quantity > 0)) {
    return response.status(400).json({ message: 'تفاصيل القطع غير صحيحة' })
  }
  if (!expectedDeliveryHours[String(deliveryHours)]
    || typeof pickupWindow !== 'string' || typeof paymentMethod !== 'string') {
    return response.status(400).json({ message: 'بيانات الموعد أو الدفع غير صحيحة' })
  }

  const orderServiceIds = extras?.serviceIds || []
  if (!Array.isArray(orderServiceIds) || orderServiceIds.some((id) => !mongoose.isValidObjectId(id))) {
    return response.status(400).json({ message: 'الخدمات الإضافية غير صحيحة' })
  }
  const [catalogItems, catalogServices, orderServices] = await Promise.all([
    Item.find({ _id: { $in: items.map((item) => item.itemId) }, active: true }),
    Service.find({ _id: { $in: items.map((item) => item.serviceId) }, active: true, applyTo: 'item' }),
    Service.find({ _id: { $in: orderServiceIds }, active: true, applyTo: 'order' }),
  ])
  await ensureItemServicePrices(catalogItems, catalogServices)
  const pairPrices = await ItemServicePrice.find({
    item: { $in: catalogItems.map((item) => item._id) },
    service: { $in: catalogServices.map((service) => service._id) },
  })
  const itemById = new Map(catalogItems.map((item) => [item.id, item]))
  const serviceById = new Map(catalogServices.map((service) => [service.id, service]))
  const priceByPair = new Map(pairPrices.map((pair) => [`${pair.item}:${pair.service}`, pair.price]))
  if (orderServices.length !== new Set(orderServiceIds).size) {
    return response.status(400).json({ message: 'خدمة إضافية لم تعد متاحة، حدّث الطلب وحاول مرة أخرى' })
  }
  const orderItems = items.map((line) => {
    const item = itemById.get(line.itemId)
    const service = serviceById.get(line.serviceId)
    const unitPrice = priceByPair.get(`${line.itemId}:${line.serviceId}`)
    if (!item || !service || !Number.isFinite(unitPrice)) return null
    return {
      name: item.name,
      service: service.name,
      quantity: line.quantity,
      unitPrice,
    }
  })
  if (orderItems.some((item) => !item)) return response.status(400).json({ message: 'قطعة أو خدمة لم تعد متاحة، حدّث الكتالوج وحاول مرة أخرى' })

  const createdAt = new Date()
  const calculatedTotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    + orderServices.reduce((sum, service) => sum + service.extra, 0)
  const order = await Order.create({
    orderNumber: `OX-${randomBytes(8).toString('hex').toUpperCase()}`,
    trackingToken: randomBytes(32).toString('hex'),
    customer,
    items: orderItems,
    total: calculatedTotal,
    extras: { rush: false, perfume: false },
    orderServices: orderServices.map((service) => ({ name: service.name, price: service.extra })),
    paymentMethod,
    pickupWindow,
    expectedDeliveryAt: new Date(createdAt.getTime() + expectedDeliveryHours[String(deliveryHours)] * 60 * 60 * 1000),
    statusHistory: [{ status: 'confirmed', changedBy: 'customer' }],
  })

  return response.status(201).json({ order: { ...order.toObject(), trackingToken: order.trackingToken } })
})

router.get('/track/:trackingToken', async (request, response) => {
  const order = await Order.findOne({ trackingToken: request.params.trackingToken }).select('+trackingToken')
    .populate('pickupDriver', 'displayName username phone')
    .populate('deliveryDriver', 'displayName username phone')
    .populate('assignedDriver', 'displayName username phone')
  if (!order) return response.status(404).json({ message: 'الطلب غير موجود' })
  return response.json({ order: { ...order.toObject(), trackingToken: undefined } })
})

export default router