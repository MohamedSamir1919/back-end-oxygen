import mongoose from 'mongoose'

const itemServicePriceSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  price: { type: Number, required: true, min: 0 },
}, { timestamps: true })

itemServicePriceSchema.index({ item: 1, service: 1 }, { unique: true })

export default mongoose.model('ItemServicePrice', itemServicePriceSchema)