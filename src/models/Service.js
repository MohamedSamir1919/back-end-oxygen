import mongoose from 'mongoose'

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 80 },
  detail: { type: String, trim: true, maxlength: 240, default: '' },
  extra: { type: Number, required: true, min: -10000, max: 10000, default: 0 },
  applyTo: { type: String, enum: ['item', 'order'], default: 'item' },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('Service', serviceSchema)