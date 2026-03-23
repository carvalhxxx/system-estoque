import { Router, Response } from 'express'
import { getPool, sql } from '../config/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { AppError } from '../middleware/errorHandler'

const router = Router()
router.use(authMiddleware)

// ── GET /api/v1/movement-types ──────────────────────────────
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('SELECT * FROM TIPOSMOVIMENTACAO WHERE TIMIDUSUARIOCADASTRO = @usuario_id ORDER BY TIMCODIGO')

  res.json(result.recordset)
}))

// ── GET /api/v1/movement-types/active ───────────────────────
router.get('/active', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('SELECT * FROM TIPOSMOVIMENTACAO WHERE TIMIDUSUARIOCADASTRO = @usuario_id AND TIMATIVO = 1 ORDER BY TIMCODIGO')

  res.json(result.recordset)
}))

// ── GET /api/v1/movement-types/:id ──────────────────────────
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id',         sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('SELECT * FROM TIPOSMOVIMENTACAO WHERE TIMIDTIPO = @id AND TIMIDUSUARIOCADASTRO = @usuario_id')

  if (result.recordset.length === 0) throw new AppError(404, 'Tipo de movimentacao nao encontrado.')

  res.json(result.recordset[0])
}))

// ── POST /api/v1/movement-types ─────────────────────────────
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { codigo, descricao, operacao, exige_justificativa } = req.body

  if (!codigo || !descricao || !operacao) throw new AppError(400, 'Codigo, descricao e operacao sao obrigatorios.')
  if (operacao !== '+' && operacao !== '-') throw new AppError(400, 'Operacao deve ser "+" ou "-".')

  const pool = await getPool()

  const result = await pool.request()
    .input('usuario_id',         sql.UniqueIdentifier, req.userId)
    .input('codigo',             sql.NVarChar,         codigo)
    .input('descricao',          sql.NVarChar,         descricao)
    .input('operacao',           sql.Char(1),          operacao)
    .input('exige_justificativa',sql.Bit,              exige_justificativa ?? false)
    .query(`
      INSERT INTO TIPOSMOVIMENTACAO (TIMIDUSUARIOCADASTRO, TIMCODIGO, TIMDESCRICAO, TIMOPERACAO, TIMEXIGEJUSTIFICATIVA)
      OUTPUT inserted.*
      VALUES (@usuario_id, @codigo, @descricao, @operacao, @exige_justificativa)
    `)

  res.status(201).json(result.recordset[0])
}))

// ── PUT /api/v1/movement-types/:id ──────────────────────────
router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { codigo, descricao, operacao, exige_justificativa, ativo } = req.body
  const pool = await getPool()

  const request = pool.request()
    .input('id',         sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  const sets: string[] = []
  if (codigo !== undefined)              { request.input('codigo',              sql.NVarChar, codigo);              sets.push('TIMCODIGO = @codigo') }
  if (descricao !== undefined)           { request.input('descricao',           sql.NVarChar, descricao);           sets.push('TIMDESCRICAO = @descricao') }
  if (operacao !== undefined)            { request.input('operacao',            sql.Char(1),  operacao);            sets.push('TIMOPERACAO = @operacao') }
  if (exige_justificativa !== undefined) { request.input('exige_justificativa', sql.Bit,      exige_justificativa); sets.push('TIMEXIGEJUSTIFICATIVA = @exige_justificativa') }
  if (ativo !== undefined)               { request.input('ativo',               sql.Bit,      ativo);               sets.push('TIMATIVO = @ativo') }

  if (sets.length === 0) throw new AppError(400, 'Nenhum campo para atualizar.')

  const result = await request.query(`
    UPDATE TIPOSMOVIMENTACAO SET ${sets.join(', ')}
    OUTPUT inserted.*
    WHERE TIMIDTIPO = @id AND TIMIDUSUARIOCADASTRO = @usuario_id
  `)

  if (result.recordset.length === 0) throw new AppError(404, 'Tipo de movimentacao nao encontrado.')

  res.json(result.recordset[0])
}))

// ── DELETE /api/v1/movement-types/:id ───────────────────────
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id',         sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('DELETE FROM TIPOSMOVIMENTACAO WHERE TIMIDTIPO = @id AND TIMIDUSUARIOCADASTRO = @usuario_id')

  if (result.rowsAffected[0] === 0) throw new AppError(404, 'Tipo de movimentacao nao encontrado.')

  res.status(204).send()
}))

export default router
