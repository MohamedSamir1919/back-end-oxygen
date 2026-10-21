import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  category: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  price: { type: Number, required: true, min: 0 },
  icon: { type: String, default: 'shirt' },
  active: { type: Boolean, default: true },
}, { timestamps: true })

itemSchema.index({ name: 1, category: 1 }, { unique: true })

export default mongoose.model('Item', itemSchema)