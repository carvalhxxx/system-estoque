import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { getPool } from './config/database'
import { errorHandler } from './middleware/errorHandler'

// Rotas
import authRoutes from './routes/auth'
import categoriesRoutes from './routes/categories'
import productsRoutes from './routes/products'
import movementTypesRoutes from './routes/movementTypes'
import movementsRoutes from './routes/movements'
import unitsRoutes from './routes/units'
import dashboardRoutes from './routes/dashboard'
import reportsRoutes from './routes/reports'

dotenv.config()

// ── Validacao de variaveis de ambiente ─────────────────────
const requiredEnvVars = ['JWT_SECRET'] as const
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: variavel de ambiente ${envVar} nao definida.`)
    process.exit(1)
  }
}

const app = express()
const PORT = process.env.PORT || 3001

// ── Seguranca ────────────────────────────────────────────
app.use(helmet())

// ── Middlewares ──────────────────────────────────────────────
app.use(express.json())

// CORS configuravel via .env
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

// ── Rate Limiting ────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 20,                 // max 20 tentativas de login por IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
})

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  limit: 200,               // max 200 requests por minuto por IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes. Tente novamente em instantes.' },
})

app.use('/api/v1/auth/login', authLimiter)
app.use('/api/v1/auth/register', authLimiter)
app.use('/api/v1', apiLimiter)

// ── Rotas ───────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/categories', categoriesRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/movement-types', movementTypesRoutes)
app.use('/api/v1/movements', movementsRoutes)
app.use('/api/v1/units', unitsRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/reports', reportsRoutes)

// Health check
app.get('/api/v1/health', async (_req, res) => {
  try {
    const pool = await getPool()
    await pool.request().query('SELECT 1')
    res.json({ status: 'ok', database: 'connected' })
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' })
  }
})

// ── Error Handler Global ─────────────────────────────────
app.use(errorHandler)

// ── Start ───────────────────────────────────────────────────
async function start() {
  try {
    await getPool()

    app.listen(PORT, () => {
      console.log(`API rodando em http://localhost:${PORT}`)
      console.log(`Health check: http://localhost:${PORT}/api/v1/health`)
      console.log(`CORS liberado para: ${allowedOrigins.join(', ')}`)
    })
  } catch (err) {
    console.error('Falha ao conectar no banco de dados:', err)
    process.exit(1)
  }
}

start()
