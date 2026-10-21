import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import driverRoutes from './routes/driverRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import orderAdminRoutes from './routes/orderAdminRoutes.js'
import catalogRoutes from './routes/catalogRoutes.js'
import adminCatalogRoutes from './routes/adminCatalogRoutes.js'

const app = express()

// app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }))
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/admin/catalog', adminCatalogRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/admin/orders', orderAdminRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/driver', driverRoutes)
app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'حدث خطأ داخلي في الخادم' })
})

export default app