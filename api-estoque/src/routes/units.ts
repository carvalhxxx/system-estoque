import { Router, Response } from 'express'
import { getPool, sql } from '../config/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { AppError } from '../middleware/errorHandler'

const router = Router()
router.use(authMiddleware)

// ── GET /api/v1/units ────────────────────────────────────────
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('SELECT * FROM UNIDADESMEDIDA WHERE UNIIDUSUARIOCADASTRO = @usuario_id ORDER BY UNISIGLA')

  res.json(result.recordset)
}))

// ── GET /api/v1/units/:id ────────────────────────────────────
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('SELECT * FROM UNIDADESMEDIDA WHERE UNIIDUNIDADE = @id AND UNIIDUSUARIOCADASTRO = @usuario_id')

  if (result.recordset.length === 0) throw new AppError(404, 'Unidade nao encontrada.')

  res.json(result.recordset[0])
}))

// ── POST /api/v1/units ───────────────────────────────────────
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sigla, descricao } = req.body

  if (!sigla || !descricao) throw new AppError(400, 'Sigla e descricao sao obrigatorios.')

  const pool = await getPool()

  const result = await pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .input('sigla', sql.NVarChar, sigla.trim().toLowerCase())
    .input('descricao', sql.NVarChar, descricao.trim())
    .query(`
      INSERT INTO UNIDADESMEDIDA (UNIIDUSUARIOCADASTRO, UNISIGLA, UNIDESCRICAO)
      OUTPUT inserted.*
      VALUES (@usuario_id, @sigla, @descricao)
    `)

  res.status(201).json(result.recordset[0])
}))

// ── PUT /api/v1/units/:id ────────────────────────────────────
router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sigla, descricao, ativo } = req.body
  const pool = await getPool()

  const request = pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  const sets: string[] = []
  if (sigla !== undefined)     { request.input('sigla', sql.NVarChar, sigla.trim().toLowerCase()); sets.push('UNISIGLA = @sigla') }
  if (descricao !== undefined) { request.input('descricao', sql.NVarChar, descricao.trim());       sets.push('UNIDESCRICAO = @descricao') }
  if (ativo !== undefined)     { request.input('ativo', sql.Bit, ativo);                           sets.push('UNIATIVO = @ativo') }

  if (sets.length === 0) throw new AppError(400, 'Nenhum campo para atualizar.')

  const result = await request.query(`
    UPDATE UNIDADESMEDIDA SET ${sets.join(', ')}
    OUTPUT inserted.*
    WHERE UNIIDUNIDADE = @id AND UNIIDUSUARIOCADASTRO = @usuario_id
  `)

  if (result.recordset.length === 0) throw new AppError(404, 'Unidade nao encontrada.')

  res.json(result.recordset[0])
}))

// ── DELETE /api/v1/units/:id ─────────────────────────────────
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('DELETE FROM UNIDADESMEDIDA WHERE UNIIDUNIDADE = @id AND UNIIDUSUARIOCADASTRO = @usuario_id')

  if (result.rowsAffected[0] === 0) throw new AppError(404, 'Unidade nao encontrada.')

  res.status(204).send()
}))

export default router
