import mongoose from 'mongoose'

const staffUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  displayName: {
    type: String,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'driver'],
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true })

export default mongoose.model('StaffUser', staffUserSchema)