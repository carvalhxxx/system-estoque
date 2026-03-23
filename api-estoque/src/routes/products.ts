import { Router, Response } from 'express'
import { getPool, sql } from '../config/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { AppError } from '../middleware/errorHandler'
import type { ProdutoRow } from '../types/recordsets'

const router = Router()
router.use(authMiddleware)

const SELECT_PRODUTO = `
  SELECT
    p.*,
    c.CATIDCATEGORIA AS categoria_id_ref,
    c.CATNOME        AS categoria_nome,
    u.UNIIDUNIDADE   AS unidade_id_ref,
    u.UNISIGLA       AS unidade_sigla,
    u.UNIDESCRICAO   AS unidade_descricao
  FROM PRODUTOS p
  LEFT JOIN CATEGORIAS c ON c.CATIDCATEGORIA = p.PROIDCATEGORIA
  LEFT JOIN UNIDADESMEDIDA u ON u.UNIIDUNIDADE = p.PROIDUNIDADE
`

function formatProduto(row: ProdutoRow) {
  const { categoria_id_ref, categoria_nome, unidade_id_ref, unidade_sigla, unidade_descricao, ...produto } = row
  return {
    ...produto,
    categoria: categoria_id_ref
      ? { id: categoria_id_ref, nome: categoria_nome }
      : null,
    unidade: unidade_id_ref
      ? { id: unidade_id_ref, sigla: unidade_sigla, descricao: unidade_descricao }
      : null,
  }
}

// ── GET /api/v1/products ────────────────────────────────────
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()
  const request = pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  let where = 'WHERE p.PROIDUSUARIOCADASTRO = @usuario_id'

  if (req.query.search) {
    request.input('search', sql.NVarChar, `%${req.query.search}%`)
    where += ' AND p.PRONOME LIKE @search'
  }

  const result = await request.query(`${SELECT_PRODUTO} ${where} ORDER BY p.PRONOME`)
  res.json(result.recordset.map(formatProduto))
}))

// ── GET /api/v1/products/active ─────────────────────────────
router.get('/active', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()
  const request = pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  let where = 'WHERE p.PROIDUSUARIOCADASTRO = @usuario_id AND p.PROATIVO = 1'

  if (req.query.search) {
    request.input('search', sql.NVarChar, `%${req.query.search}%`)
    where += ' AND p.PRONOME LIKE @search'
  }

  const result = await request.query(`${SELECT_PRODUTO} ${where} ORDER BY p.PRONOME`)
  res.json(result.recordset.map(formatProduto))
}))

// ── GET /api/v1/products/low-stock ──────────────────────────
router.get('/low-stock', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query(`
      ${SELECT_PRODUTO}
      WHERE p.PROIDUSUARIOCADASTRO = @usuario_id
        AND p.PROATIVO = 1
        AND p.PROESTOQUEATUAL <= p.PROESTOQUEMINIMO
      ORDER BY p.PRONOME
    `)

  res.json(result.recordset.map(formatProduto))
}))

// ── GET /api/v1/products/:id ────────────────────────────────
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query(`${SELECT_PRODUTO} WHERE p.PROIDPRODUTO = @id AND p.PROIDUSUARIOCADASTRO = @usuario_id`)

  if (result.recordset.length === 0) throw new AppError(404, 'Produto nao encontrado.')

  res.json(formatProduto(result.recordset[0]))
}))

// ── POST /api/v1/products ───────────────────────────────────
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome, sku, descricao, unidade_id, preco_custo, preco_venda, estoque_atual, estoque_minimo, categoria_id } = req.body

  if (!nome) throw new AppError(400, 'Nome e obrigatorio.')

  const pool = await getPool()

  const insertResult = await pool.request()
    .input('usuario_id',    sql.UniqueIdentifier, req.userId)
    .input('nome',          sql.NVarChar,         nome)
    .input('sku',           sql.NVarChar,         sku || null)
    .input('descricao',     sql.NVarChar,         descricao || null)
    .input('unidade_id',   sql.UniqueIdentifier, unidade_id || null)
    .input('preco_custo',  sql.Decimal(10, 2),   preco_custo ?? null)
    .input('preco_venda',   sql.Decimal(10, 2),   preco_venda ?? null)
    .input('estoque_atual', sql.Decimal(10, 3),   estoque_atual ?? 0)
    .input('estoque_minimo',sql.Decimal(10, 3),   estoque_minimo ?? 0)
    .input('categoria_id',  sql.UniqueIdentifier, categoria_id || null)
    .query(`
      INSERT INTO PRODUTOS (PROIDUSUARIOCADASTRO, PRONOME, PROSKU, PRODESCRICAO, PROIDUNIDADE, PROPRECOCUSTO, PROPRECOVENDA, PROESTOQUEATUAL, PROESTOQUEMINIMO, PROIDCATEGORIA)
      OUTPUT inserted.PROIDPRODUTO
      VALUES (@usuario_id, @nome, @sku, @descricao, @unidade_id, @preco_custo, @preco_venda, @estoque_atual, @estoque_minimo, @categoria_id)
    `)

  const newId = insertResult.recordset[0].PROIDPRODUTO

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, newId)
    .query(`${SELECT_PRODUTO} WHERE p.PROIDPRODUTO = @id`)

  res.status(201).json(formatProduto(result.recordset[0]))
}))

// ── PUT /api/v1/products/:id ────────────────────────────────
router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nome, sku, descricao, unidade_id, preco_custo, preco_venda, estoque_minimo, categoria_id, ativo } = req.body
  const pool = await getPool()

  const request = pool.request()
    .input('id',         sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  const sets: string[] = []
  if (nome !== undefined)          { request.input('nome',          sql.NVarChar,         nome);          sets.push('PRONOME = @nome') }
  if (sku !== undefined)           { request.input('sku',           sql.NVarChar,         sku);           sets.push('PROSKU = @sku') }
  if (descricao !== undefined)     { request.input('descricao',     sql.NVarChar,         descricao);     sets.push('PRODESCRICAO = @descricao') }
  if (unidade_id !== undefined)    { request.input('unidade_id',   sql.UniqueIdentifier, unidade_id);    sets.push('PROIDUNIDADE = @unidade_id') }
  if (preco_custo !== undefined)   { request.input('preco_custo',   sql.Decimal(10, 2),   preco_custo);   sets.push('PROPRECOCUSTO = @preco_custo') }
  if (preco_venda !== undefined)   { request.input('preco_venda',   sql.Decimal(10, 2),   preco_venda);   sets.push('PROPRECOVENDA = @preco_venda') }
  if (estoque_minimo !== undefined) { request.input('estoque_minimo', sql.Decimal(10, 3), estoque_minimo); sets.push('PROESTOQUEMINIMO = @estoque_minimo') }
  if (categoria_id !== undefined)  { request.input('categoria_id',  sql.UniqueIdentifier, categoria_id);  sets.push('PROIDCATEGORIA = @categoria_id') }
  if (ativo !== undefined)         { request.input('ativo',         sql.Bit,              ativo);         sets.push('PROATIVO = @ativo') }

  if (sets.length === 0) throw new AppError(400, 'Nenhum campo para atualizar.')

  await request.query(`
    UPDATE PRODUTOS SET ${sets.join(', ')}
    WHERE PROIDPRODUTO = @id AND PROIDUSUARIOCADASTRO = @usuario_id
  `)

  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.params.id)
    .query(`${SELECT_PRODUTO} WHERE p.PROIDPRODUTO = @id`)

  if (result.recordset.length === 0) throw new AppError(404, 'Produto nao encontrado.')

  res.json(formatProduto(result.recordset[0]))
}))

// ── PATCH /api/v1/products/:id/deactivate ───────────────────
router.patch('/:id/deactivate', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id',         sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('UPDATE PRODUTOS SET PROATIVO = 0 WHERE PROIDPRODUTO = @id AND PROIDUSUARIOCADASTRO = @usuario_id')

  if (result.rowsAffected[0] === 0) throw new AppError(404, 'Produto nao encontrado.')

  res.json({ message: 'Produto desativado.' })
}))

// ── DELETE /api/v1/products/:id (soft delete) ───────────────
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('id',         sql.UniqueIdentifier, req.params.id)
    .input('usuario_id', sql.UniqueIdentifier, req.userId)
    .query('UPDATE PRODUTOS SET PROATIVO = 0 WHERE PROIDPRODUTO = @id AND PROIDUSUARIOCADASTRO = @usuario_id')

  if (result.rowsAffected[0] === 0) throw new AppError(404, 'Produto nao encontrado.')

  res.status(204).send()
}))

export default router
