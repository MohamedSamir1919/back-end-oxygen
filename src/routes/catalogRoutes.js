import { Router } from 'express'
import Item from '../models/Item.js'
import Service from '../models/Service.js'

const router = Router()

router.get('/', async (_request, response) => {
  const [items, services] = await Promise.all([
    Item.find({ active: true }).sort({ category: 1, name: 1 }),
    Service.find({ active: true }).sort({ name: 1 }),
  ])
  return response.json({ items, services })
})

export default router