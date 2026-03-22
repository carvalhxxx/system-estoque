import { Router, Response } from 'express'
import bcrypt from 'bcrypt'
import { getPool, sql } from '../config/database'
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// ── POST /api/v1/auth/register ──────────────────────────────
router.post('/register', asyncHandler(async (req, res) => {
  const { login, nome, senha } = req.body

  if (!login || !nome || !senha) throw new AppError(400, 'Login, nome e senha sao obrigatorios.')

  const pool = await getPool()

  const existing = await pool.request()
    .input('login', sql.NVarChar, login)
    .query('SELECT USUIDUSUARIO FROM USUARIOS WHERE USULOGIN = @login')

  if (existing.recordset.length > 0) throw new AppError(409, 'Login ja cadastrado.')

  const senha_hash = await bcrypt.hash(senha, 10)

  const result = await pool.request()
    .input('login',      sql.NVarChar, login)
    .input('nome',       sql.NVarChar, nome)
    .input('senha_hash', sql.NVarChar, senha_hash)
    .query(`
      INSERT INTO USUARIOS (USULOGIN, USUNOME, USUSENHAHASH)
      OUTPUT inserted.USUIDUSUARIO, inserted.USULOGIN, inserted.USUNOME, inserted.USUDATACADASTRO
      VALUES (@login, @nome, @senha_hash)
    `)

  const user = result.recordset[0]
  const token = generateToken(user.USUIDUSUARIO)

  res.status(201).json({ user: { id: user.USUIDUSUARIO, login: user.USULOGIN, nome: user.USUNOME }, token })
}))

// ── POST /api/v1/auth/login ─────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const { login, senha } = req.body

  if (!login || !senha) throw new AppError(400, 'Login e senha sao obrigatorios.')

  const pool = await getPool()

  const result = await pool.request()
    .input('login', sql.NVarChar, login)
    .query('SELECT USUIDUSUARIO, USULOGIN, USUNOME, USUSENHAHASH FROM USUARIOS WHERE USULOGIN = @login AND USUATIVO = 1')

  if (result.recordset.length === 0) throw new AppError(401, 'Login ou senha invalidos.')

  const user = result.recordset[0]
  const senhaValida = await bcrypt.compare(senha, user.USUSENHAHASH)

  if (!senhaValida) throw new AppError(401, 'Login ou senha invalidos.')

  const token = generateToken(user.USUIDUSUARIO)

  res.json({
    user: { id: user.USUIDUSUARIO, login: user.USULOGIN, nome: user.USUNOME },
    token,
  })
}))

// ── GET /api/v1/auth/me ─────────────────────────────────────
router.get('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.userId)
    .query('SELECT USUIDUSUARIO AS id, USULOGIN AS login, USUNOME AS nome, USUDATACADASTRO AS criado_em FROM USUARIOS WHERE USUIDUSUARIO = @id AND USUATIVO = 1')

  if (result.recordset.length === 0) throw new AppError(404, 'Usuario nao encontrado.')

  res.json(result.recordset[0])
}))

// ── PUT /api/v1/auth/profile ──────────────────────────────
router.put('/profile', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome } = req.body

  if (!nome || !nome.trim()) throw new AppError(400, 'Nome e obrigatorio.')

  const pool = await getPool()

  await pool.request()
    .input('id',   sql.UniqueIdentifier, req.userId)
    .input('nome', sql.NVarChar, nome.trim())
    .query('UPDATE USUARIOS SET USUNOME = @nome WHERE USUIDUSUARIO = @id')

  res.json({ nome: nome.trim() })
}))

// ── PUT /api/v1/auth/password ─────────────────────────────
router.put('/password', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { senhaAtual, novaSenha } = req.body

  if (!senhaAtual || !novaSenha) throw new AppError(400, 'Senha atual e nova senha sao obrigatorias.')
  if (novaSenha.length < 6) throw new AppError(400, 'A nova senha deve ter pelo menos 6 caracteres.')

  const pool = await getPool()

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.userId)
    .query('SELECT USUSENHAHASH FROM USUARIOS WHERE USUIDUSUARIO = @id')

  if (result.recordset.length === 0) throw new AppError(404, 'Usuario nao encontrado.')

  const senhaValida = await bcrypt.compare(senhaAtual, result.recordset[0].USUSENHAHASH)
  if (!senhaValida) throw new AppError(401, 'Senha atual incorreta.')

  const novaHash = await bcrypt.hash(novaSenha, 10)

  await pool.request()
    .input('id',   sql.UniqueIdentifier, req.userId)
    .input('hash', sql.NVarChar, novaHash)
    .query('UPDATE USUARIOS SET USUSENHAHASH = @hash WHERE USUIDUSUARIO = @id')

  res.json({ message: 'Senha alterada com sucesso.' })
}))

export default router
