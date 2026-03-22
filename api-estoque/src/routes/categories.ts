import { Router, Response } from 'express'
import { getPool, sql } from '../config/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { AppError } from '../middleware/errorHandler'

const router = Router()
router.use(authMiddleware)

// ── GET /api/v1/categories ──────────────────────────────────
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('SELECT * FROM CATEGORIAS WHERE CATIDUSUARIOCADASTRO = @usuario_id ORDER BY CATNOME')

  res.json(result.recordset)
}))

// ── GET /api/v1/categories/:id ──────────────────────────────
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('SELECT * FROM CATEGORIAS WHERE CATIDCATEGORIA = @id AND CATIDUSUARIOCADASTRO = @usuario_id')

  if (result.recordset.length === 0) throw new AppError(404, 'Categoria nao encontrada.')

  res.json(result.recordset[0])
}))

// ── POST /api/v1/categories ─────────────────────────────────
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome } = req.body

  if (!nome) throw new AppError(400, 'Nome e obrigatorio.')

  const pool = await getPool()

  const result = await pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .input('nome', sql.NVarChar, nome)
    .query(`
      INSERT INTO CATEGORIAS (CATIDUSUARIOCADASTRO, CATNOME)
      OUTPUT inserted.*
      VALUES (@usuario_id, @nome)
    `)

  res.status(201).json(result.recordset[0])
}))

// ── PUT /api/v1/categories/:id ──────────────────────────────
router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome, ativo } = req.body
  const pool = await getPool()

  const request = pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  const sets: string[] = []
  if (nome !== undefined)  { request.input('nome', sql.NVarChar, nome); sets.push('CATNOME = @nome') }
  if (ativo !== undefined) { request.input('ativo', sql.Bit, ativo);    sets.push('CATATIVO = @ativo') }

  if (sets.length === 0) throw new AppError(400, 'Nenhum campo para atualizar.')

  const result = await request.query(`
    UPDATE CATEGORIAS SET ${sets.join(', ')}
    OUTPUT inserted.*
    WHERE CATIDCATEGORIA = @id AND CATIDUSUARIOCADASTRO = @usuario_id
  `)

  if (result.recordset.length === 0) throw new AppError(404, 'Categoria nao encontrada.')

  res.json(result.recordset[0])
}))

// ── DELETE /api/v1/categories/:id ───────────────────────────
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  // Desvincula produtos da categoria antes de deletar
  await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query('UPDATE PRODUTOS SET PROIDCATEGORIA = NULL WHERE PROIDCATEGORIA = @id')

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('DELETE FROM CATEGORIAS WHERE CATIDCATEGORIA = @id AND CATIDUSUARIOCADASTRO = @usuario_id')

  if (result.rowsAffected[0] === 0) throw new AppError(404, 'Categoria nao encontrada.')

  res.status(204).send()
}))

export default router
