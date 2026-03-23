import dotenv from 'dotenv'
dotenv.config()

import rateLimit from 'express-rate-limit'
import { getPool } from './config/database'
import app from './app'

// ── Validacao de variaveis de ambiente ─────────────────────
const requiredEnvVars = ['JWT_SECRET'] as const
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: variavel de ambiente ${envVar} nao definida.`)
    process.exit(1)
  }
}

const PORT = process.env.PORT || 3001

// ── Rate Limiting ────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
})

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes. Tente novamente em instantes.' },
})

app.use('/api/v1/auth/login', authLimiter)
app.use('/api/v1/auth/register', authLimiter)
app.use('/api/v1', apiLimiter)

// ── Start ───────────────────────────────────────────────────
async function start() {
  try {
    await getPool()

    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim())

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
