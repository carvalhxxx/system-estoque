import { Router, Response } from 'express'
import { getPool, sql } from '../config/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { AppError } from '../middleware/errorHandler'
import type { MovimentacaoRow, MovimentacaoByProductRow } from '../types/recordsets'

const router = Router()
router.use(authMiddleware)

const SELECT_MOVIMENTACAO = `
  SELECT
    m.*,
    p.PROIDPRODUTO  AS produto_id_ref,
    p.PRONOME       AS produto_nome,
    p.PROSKU        AS produto_sku,
    p.PROUNIDADE    AS produto_unidade,
    t.TIMIDTIPO     AS tipo_id_ref,
    t.TIMCODIGO     AS tipo_codigo,
    t.TIMDESCRICAO  AS tipo_descricao,
    t.TIMOPERACAO   AS tipo_operacao
  FROM MOVIMENTACOES m
  INNER JOIN PRODUTOS          p ON p.PROIDPRODUTO = m.MOVIDPRODUTO
  INNER JOIN TIPOSMOVIMENTACAO t ON t.TIMIDTIPO    = m.MOVIDTIPO
`

function formatMovimentacao(row: MovimentacaoRow) {
  const {
    produto_id_ref, produto_nome, produto_sku, produto_unidade,
    tipo_id_ref, tipo_codigo, tipo_descricao, tipo_operacao,
    ...movimentacao
  } = row

  return {
    ...movimentacao,
    produto: {
      id: produto_id_ref,
      nome: produto_nome,
      sku: produto_sku,
      unidade: produto_unidade,
    },
    tipo_movimentacao: {
      id: tipo_id_ref,
      codigo: tipo_codigo,
      descricao: tipo_descricao,
      operacao: tipo_operacao,
    },
  }
}

// ── GET /api/v1/movements ───────────────────────────────────
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()
  const request = pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  let where = 'WHERE m.MOVIDUSUARIOCADASTRO = @usuario_id'

  if (req.query.produto_id) {
    request.input('produto_id', sql.UniqueIdentifier, req.query.produto_id as string)
    where += ' AND m.MOVIDPRODUTO = @produto_id'
  }
  if (req.query.tipo_id) {
    request.input('tipo_id', sql.UniqueIdentifier, req.query.tipo_id as string)
    where += ' AND m.MOVIDTIPO = @tipo_id'
  }
  if (req.query.data_inicio) {
    request.input('data_inicio', sql.DateTime2, new Date(`${req.query.data_inicio}T00:00:00`))
    where += ' AND m.MOVDATACADASTRO >= @data_inicio'
  }
  if (req.query.data_fim) {
    request.input('data_fim', sql.DateTime2, new Date(`${req.query.data_fim}T23:59:59`))
    where += ' AND m.MOVDATACADASTRO <= @data_fim'
  }

  const result = await request.query(`
    ${SELECT_MOVIMENTACAO} ${where} ORDER BY m.MOVDATACADASTRO DESC
  `)

  res.json(result.recordset.map(formatMovimentacao))
}))

// ── GET /api/v1/movements/by-product/:produtoId ─────────────
router.get('/by-product/:produtoId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50
  const pool = await getPool()

  const result = await pool.request()
    .input('produto_id', sql.UniqueIdentifier, req.params.produtoId)
    .input('limit',      sql.Int,              limit)
    .query(`
      SELECT TOP (@limit)
        m.*,
        t.TIMIDTIPO    AS tipo_id_ref,
        t.TIMCODIGO    AS tipo_codigo,
        t.TIMDESCRICAO AS tipo_descricao,
        t.TIMOPERACAO  AS tipo_operacao
      FROM MOVIMENTACOES m
      INNER JOIN TIPOSMOVIMENTACAO t ON t.TIMIDTIPO = m.MOVIDTIPO
      WHERE m.MOVIDPRODUTO = @produto_id
      ORDER BY m.MOVDATACADASTRO DESC
    `)

  const data = result.recordset.map((row: MovimentacaoByProductRow) => {
    const { tipo_id_ref, tipo_codigo, tipo_descricao, tipo_operacao, ...rest } = row
    return {
      ...rest,
      tipo_movimentacao: { id: tipo_id_ref, codigo: tipo_codigo, descricao: tipo_descricao, operacao: tipo_operacao },
    }
  })

  res.json(data)
}))

// ── GET /api/v1/movements/:id ───────────────────────────────
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query(`${SELECT_MOVIMENTACAO} WHERE m.MOVIDMOVIMENTACAO = @id`)

  if (result.recordset.length === 0) throw new AppError(404, 'Movimentacao nao encontrada.')

  res.json(formatMovimentacao(result.recordset[0]))
}))

// ── POST /api/v1/movements ──────────────────────────────────
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { produto_id, tipo_id, justificativa, tipo_referencia, id_referencia, observacao } = req.body

  if (!produto_id || !tipo_id || !req.body.quantidade) throw new AppError(400, 'produto_id, tipo_id e quantidade sao obrigatorios.')

  const quantidade = Number(req.body.quantidade)
  if (!Number.isFinite(quantidade) || quantidade <= 0) throw new AppError(422, 'quantidade deve ser um numero positivo.')

  const pool = await getPool()
  const transaction = pool.transaction()
  await transaction.begin()

  try {
    const insertResult = await transaction.request()
      .input('usuario_id',     sql.UniqueIdentifier, req.userId)
      .input('produto_id',     sql.UniqueIdentifier, produto_id)
      .input('tipo_id',        sql.UniqueIdentifier, tipo_id)
      .input('quantidade',     sql.Decimal(10, 3),   quantidade)
      .input('justificativa',  sql.NVarChar,         justificativa || null)
      .input('tipo_referencia',sql.NVarChar,         tipo_referencia || null)
      .input('id_referencia',  sql.UniqueIdentifier, id_referencia || null)
      .input('observacao',     sql.NVarChar,         observacao || null)
      .query(`
        DECLARE @novo_id UNIQUEIDENTIFIER = NEWID();
        INSERT INTO MOVIMENTACOES (MOVIDMOVIMENTACAO, MOVIDUSUARIOCADASTRO, MOVIDPRODUTO, MOVIDTIPO, MOVQUANTIDADE, MOVJUSTIFICATIVA, MOVTIPOREFERENCIA, MOVIDREFERENCIA, MOVOBSERVACAO)
        VALUES (@novo_id, @usuario_id, @produto_id, @tipo_id, @quantidade, @justificativa, @tipo_referencia, @id_referencia, @observacao);
        SELECT @novo_id AS MOVIDMOVIMENTACAO;
      `)

    const createdId = insertResult.recordset[0].MOVIDMOVIMENTACAO

    const result = await transaction.request()
      .input('id', sql.UniqueIdentifier, createdId)
      .query(`${SELECT_MOVIMENTACAO} WHERE m.MOVIDMOVIMENTACAO = @id`)

    await transaction.commit()

    res.status(201).json(formatMovimentacao(result.recordset[0]))
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}))

// ── POST /api/v1/movements/:id/cancel ───────────────────────
router.post('/:id/cancel', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { justificativa } = req.body

  if (!justificativa) throw new AppError(400, 'Justificativa e obrigatoria para cancelamento.')

  const pool = await getPool()

  const result = await pool.request()
    .input('p_id_movimentacao', sql.UniqueIdentifier, req.params.id)
    .input('p_id_usuario',      sql.UniqueIdentifier, req.userId)
    .input('p_justificativa',   sql.NVarChar,         justificativa)
    .output('novo_id_movimentacao', sql.UniqueIdentifier)
    .execute('sp_cancelar_movimentacao')

  const novoId = result.output.novo_id_movimentacao

  res.json({ novo_id_movimentacao: novoId })
}))

export default router
