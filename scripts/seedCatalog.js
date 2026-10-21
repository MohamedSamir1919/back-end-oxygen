import 'dotenv/config'
import mongoose from 'mongoose'
import Item from '../src/models/Item.js'
import Service from '../src/models/Service.js'
import { ensureItemServicePrices } from '../src/services/itemServicePrices.js'

const items = [
  { name: 'قميص', category: 'رجالي', price: 22, icon: 'shirt' },
  { name: 'بنطلون', category: 'رجالي', price: 28, icon: 'pants' },
  { name: 'بدلة كاملة', category: 'رجالي', price: 95, icon: 'suit' },
  { name: 'تيشيرت', category: 'رجالي', price: 18, icon: 'shirt' },
  { name: 'فستان', category: 'حريمي', price: 65, icon: 'dress' },
  { name: 'عباية', category: 'حريمي', price: 48, icon: 'dress' },
  { name: 'بلوزة', category: 'حريمي', price: 22, icon: 'shirt' },
  { name: 'طرحة', category: 'حريمي', price: 14, icon: 'shirt' },
  { name: 'سجادة', category: 'مفروشات', price: 120, icon: 'rug' },
  { name: 'بطانية', category: 'مفروشات', price: 75, icon: 'blanket' },
  { name: 'ستارة', category: 'مفروشات', price: 90, icon: 'curtain' },
  { name: 'مفرش سرير', category: 'مفروشات', price: 55, icon: 'blanket' },
]

const services = [
  { name: 'غسيل ومكواة', detail: 'تنظيف متكامل وعناية يومية', extra: 0, applyTo: 'item' },
  { name: 'مكواة فقط', detail: 'كيّ احترافي يحافظ على شكل القطعة', extra: -6, applyTo: 'item' },
  { name: 'دراي كلين', detail: 'تنظيف جاف للأقمشة الحساسة', extra: 18, applyTo: 'item' },
  { name: 'إزالة بقع', detail: 'معالجة مركزة للبقع الصعبة', extra: 12, applyTo: 'item' },
  { name: 'خدمة مستعجلة', detail: 'استلام وتسليم خلال ٤–٦ ساعات حسب التغطية', extra: 35, applyTo: 'order' },
  { name: 'تعطير خاص', detail: 'اختار من عطورنا الهادية بعد الغسيل', extra: 10, applyTo: 'order' },
]

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
await mongoose.connect(process.env.MONGODB_URI)
await Promise.all([
  Item.init(),
  Service.init(),
])
await Service.updateMany({ applyTo: { $exists: false } }, { $set: { applyTo: 'item' } })
await Promise.all(items.map((item) => Item.updateOne(
  { name: item.name, category: item.category },
  { $setOnInsert: item },
  { upsert: true },
)))
await Promise.all(services.map((service) => Service.updateOne(
  { name: service.name },
  { $setOnInsert: service },
  { upsert: true },
)))
const [savedItems, savedServices] = await Promise.all([Item.find(), Service.find()])
await ensureItemServicePrices(savedItems, savedServices)
console.log(`Seeded ${items.length} catalog items and ${services.length} services`)
await mongoose.disconnect()