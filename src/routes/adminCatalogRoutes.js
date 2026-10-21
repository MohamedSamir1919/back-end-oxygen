import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticateToken, authorizeRoles } from '../middleware/auth.js'
import Item from '../models/Item.js'
import Service from '../models/Service.js'
import ItemServicePrice from '../models/ItemServicePrice.js'
import { ensureItemServicePrices } from '../services/itemServicePrices.js'

const router = Router()
router.use(authenticateToken, authorizeRoles('admin'))

function validItem({ name, category, price }) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 80
    && typeof category === 'string' && category.trim().length >= 2 && category.trim().length <= 60
    && Number.isFinite(price) && price >= 0
}

function validService({ name, detail, extra, applyTo }) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 80
    && (detail === undefined || (typeof detail === 'string' && detail.length <= 240))
    && Number.isFinite(extra) && extra >= -10000 && extra <= 10000
    && (applyTo === undefined || ['item', 'order'].includes(applyTo))
}

router.get('/', async (_request, response) => {
  const [items, services] = await Promise.all([
    Item.find().sort({ category: 1, name: 1 }),
    Service.find().sort({ name: 1 }),
  ])
  await ensureItemServicePrices(items, services)
  const prices = await ItemServicePrice.find()
  return response.json({ items, services, prices })
})

router.post('/items', async (request, response) => {
  const { name, category, price, icon } = request.body || {}
  if (!validItem({ name, category, price })) return response.status(400).json({ message: 'اسم القطعة والقسم وسعر صحيح مطلوبة' })
  try {
    const item = await Item.create({ name: name.trim(), category: category.trim(), price, icon: typeof icon === 'string' ? icon : 'shirt' })
    const services = await Service.find({ applyTo: 'item' })
    await ensureItemServicePrices([item], services)
    return response.status(201).json({ item })
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'القطعة موجودة بالفعل في هذا القسم' })
    throw error
  }
})

router.patch('/items/:itemId', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.itemId)) return response.status(400).json({ message: 'معرّف القطعة غير صالح' })
  const item = await Item.findById(request.params.itemId)
  if (!item) return response.status(404).json({ message: 'القطعة غير موجودة' })
  const values = { name: request.body?.name ?? item.name, category: request.body?.category ?? item.category, price: request.body?.price ?? item.price }
  if (!validItem(values) || (request.body?.active !== undefined && typeof request.body.active !== 'boolean')) {
    return response.status(400).json({ message: 'بيانات القطعة غير صحيحة' })
  }
  item.name = values.name.trim()
  item.category = values.category.trim()
  item.price = values.price
  if (request.body?.active !== undefined) item.active = request.body.active
  try {
    await item.save()
    const services = await Service.find({ applyTo: 'item' })
    await ensureItemServicePrices([item], services)
    return response.json({ item })
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'القطعة موجودة بالفعل في هذا القسم' })
    throw error
  }
})

router.post('/services', async (request, response) => {
  const { name, detail, extra, applyTo } = request.body || {}
  if (!validService({ name, detail, extra, applyTo })) return response.status(400).json({ message: 'بيانات الخدمة وسعرها غير صحيحة' })
  try {
    const service = await Service.create({ name: name.trim(), detail: detail?.trim() || '', extra, applyTo: applyTo || 'item' })
    if (service.applyTo === 'item') {
      const items = await Item.find()
      await ensureItemServicePrices(items, [service])
    }
    return response.status(201).json({ service })
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'اسم الخدمة مستخدم بالفعل' })
    throw error
  }
})

router.patch('/services/:serviceId', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.serviceId)) return response.status(400).json({ message: 'معرّف الخدمة غير صالح' })
  const service = await Service.findById(request.params.serviceId)
  if (!service) return response.status(404).json({ message: 'الخدمة غير موجودة' })
  const values = { name: request.body?.name ?? service.name, detail: request.body?.detail ?? service.detail, extra: request.body?.extra ?? service.extra, applyTo: request.body?.applyTo ?? service.applyTo }
  if (!validService(values) || (request.body?.active !== undefined && typeof request.body.active !== 'boolean')) {
    return response.status(400).json({ message: 'بيانات الخدمة غير صحيحة' })
  }
  service.name = values.name.trim()
  service.detail = values.detail.trim()
  service.extra = values.extra
  service.applyTo = values.applyTo
  if (request.body?.active !== undefined) service.active = request.body.active
  try {
    await service.save()
    if (service.applyTo === 'item') {
      const items = await Item.find()
      await ensureItemServicePrices(items, [service])
    }
    return response.json({ service })
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'اسم الخدمة مستخدم بالفعل' })
    throw error
  }
})

router.put('/prices', async (request, response) => {
  const { itemId, serviceId, price } = request.body || {}
  if (!mongoose.isValidObjectId(itemId) || !mongoose.isValidObjectId(serviceId) || !Number.isFinite(price) || price < 0) {
    return response.status(400).json({ message: 'اختر قطعة وخدمة وأدخل سعرًا صحيحًا' })
  }
  const [item, service] = await Promise.all([Item.findById(itemId), Service.findById(serviceId)])
  if (!item || !service || service.applyTo !== 'item') {
    return response.status(404).json({ message: 'القطعة أو خدمة القطع غير موجودة' })
  }
  const itemServicePrice = await ItemServicePrice.findOneAndUpdate(
    { item: item._id, service: service._id },
    { $set: { price } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  )
  return response.json({ price: itemServicePrice })
})

export default router