import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'

const { MONGODB_URI, JWT_SECRET } = process.env
if (!MONGODB_URI) throw new Error('MONGODB_URI is required')
if (!JWT_SECRET ) throw new Error('JWT_SECRET must be at least 32 characters')

await mongoose.connect(MONGODB_URI)
const port = Number(process.env.PORT) || 5000
app.listen(port, () => console.log(`Oxygen API listening on port ${port}`))