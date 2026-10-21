import { Router } from 'express'
import Item from '../models/Item.js'
import Service from '../models/Service.js'
import ItemServicePrice from '../models/ItemServicePrice.js'
import { ensureItemServicePrices } from '../services/itemServicePrices.js'

const router = Router()

router.get('/', async (_request, response) => {
  const [items, services] = await Promise.all([
    Item.find({ active: true }).sort({ category: 1, name: 1 }),
    Service.find({ active: true }).sort({ name: 1 }),
  ])
  const itemServices = services.filter((service) => service.applyTo === 'item')
  await ensureItemServicePrices(items, itemServices)
  const prices = await ItemServicePrice.find({
    item: { $in: items.map((item) => item._id) },
    service: { $in: itemServices.map((service) => service._id) },
  })
  return response.json({ items, services, prices })
})

export default router