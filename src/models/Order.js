import mongoose from 'mongoose'

const orderStatus = ['confirmed', 'assigned', 'picked_up', 'processing', 'ready_for_delivery', 'delivered']

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  trackingToken: { type: String, required: true, unique: true, select: false },
  customer: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true, default: '' },
  },
  items: [{
    name: { type: String, required: true },
    service: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  }],
  total: { type: Number, required: true, min: 0 },
  extras: { rush: { type: Boolean, default: false }, perfume: { type: Boolean, default: false } },
  orderServices: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
  }],
  paymentMethod: { type: String, required: true },
  pickupWindow: { type: String, required: true },
  expectedDeliveryAt: { type: Date, required: true },
  pickedUpAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffUser', default: null },
  status: { type: String, enum: orderStatus, default: 'confirmed' },
  statusHistory: [{
    status: { type: String, enum: orderStatus, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'customer' },
  }],
}, { timestamps: true })

orderSchema.index({ assignedDriver: 1, createdAt: -1 })

export default mongoose.model('Order', orderSchema)