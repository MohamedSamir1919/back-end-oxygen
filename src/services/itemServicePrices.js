import ItemServicePrice from '../models/ItemServicePrice.js'

export async function ensureItemServicePrices(items, services) {
  await ItemServicePrice.init()
  const itemServices = services.filter((service) => service.applyTo === 'item')
  const operations = items.flatMap((item) => itemServices.map((service) => ({
    updateOne: {
      filter: { item: item._id, service: service._id },
      update: { $setOnInsert: { price: Math.max(8, item.price + service.extra) } },
      upsert: true,
    },
  })))

  if (operations.length) await ItemServicePrice.bulkWrite(operations, { ordered: false })
}