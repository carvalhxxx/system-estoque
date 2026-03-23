import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler'

import authRoutes from './routes/auth'
import categoriesRoutes from './routes/categories'
import productsRoutes from './routes/products'
import movementTypesRoutes from './routes/movementTypes'
import movementsRoutes from './routes/movements'
import unitsRoutes from './routes/units'
import dashboardRoutes from './routes/dashboard'
import reportsRoutes from './routes/reports'

const app = express()

app.use(helmet())
app.use(express.json())

app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
  credentials: true,
}))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/categories', categoriesRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/movement-types', movementTypesRoutes)
app.use('/api/v1/movements', movementsRoutes)
app.use('/api/v1/units', unitsRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/reports', reportsRoutes)

app.get('/api/v1/health', async (_req, res) => {
  res.json({ status: 'ok' })
})

app.use(errorHandler)

export default app
