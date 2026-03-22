import { Router, Response } from 'express'
import { getPool, sql } from '../config/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

// ── GET /api/v1/reports/internal ──────────────────────────
router.get('/internal', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()
  const request = pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  let where = 'WHERE p.PROIDUSUARIOCADASTRO = @usuario_id AND p.PROATIVO = 1'

  if (req.query.categoria_id) {
    request.input('categoria_id', sql.UniqueIdentifier, req.query.categoria_id as string)
    where += ' AND p.PROIDCATEGORIA = @categoria_id'
  }

  const result = await request.query(`
    SELECT
      p.PROIDPRODUTO,
      p.PRONOME,
      p.PROSKU,
      p.PRODESCRICAO,
      p.PROPRECOCUSTO,
      p.PROPRECOVENDA,
      p.PROESTOQUEATUAL,
      p.PROESTOQUEMINIMO,
      c.CATNOME AS categoria_nome,
      u.UNISIGLA AS unidade_sigla
    FROM PRODUTOS p
    LEFT JOIN CATEGORIAS c ON c.CATIDCATEGORIA = p.PROIDCATEGORIA
    LEFT JOIN UNIDADESMEDIDA u ON u.UNIIDUNIDADE = p.PROIDUNIDADE
    ${where}
    ORDER BY c.CATNOME, p.PRONOME
  `)

  let totalPecas = 0
  let totalCusto = 0
  let totalVenda = 0

  const produtos = result.recordset.map((r: any) => {
    const valorTotalCusto = (r.PROPRECOCUSTO ?? 0) * r.PROESTOQUEATUAL
    const valorTotalVenda = (r.PROPRECOVENDA ?? 0) * r.PROESTOQUEATUAL
    const lucroUnitario = (r.PROPRECOVENDA ?? 0) - (r.PROPRECOCUSTO ?? 0)
    const lucroTotal = lucroUnitario * r.PROESTOQUEATUAL

    totalPecas += r.PROESTOQUEATUAL
    totalCusto += valorTotalCusto
    totalVenda += valorTotalVenda

    return {
      id: r.PROIDPRODUTO,
      nome: r.PRONOME,
      sku: r.PROSKU,
      descricao: r.PRODESCRICAO,
      categoria: r.categoria_nome || 'Sem categoria',
      unidade: r.unidade_sigla || 'un',
      preco_custo: r.PROPRECOCUSTO ?? 0,
      preco_venda: r.PROPRECOVENDA ?? 0,
      estoque_atual: r.PROESTOQUEATUAL,
      estoque_minimo: r.PROESTOQUEMINIMO,
      valor_total_custo: valorTotalCusto,
      valor_total_venda: valorTotalVenda,
      lucro_unitario: lucroUnitario,
      lucro_total: lucroTotal,
    }
  })

  res.json({
    produtos,
    totais: {
      total_produtos: produtos.length,
      total_pecas: totalPecas,
      total_custo: totalCusto,
      total_venda: totalVenda,
      lucro_total: totalVenda - totalCusto,
    },
  })
}))

// ── GET /api/v1/reports/client ────────────────────────────
router.get('/client', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()
  const request = pool.request()
    .input('usuario_id', sql.UniqueIdentifier, req.userId)

  let where = 'WHERE p.PROIDUSUARIOCADASTRO = @usuario_id AND p.PROATIVO = 1 AND p.PROPRECOVENDA IS NOT NULL AND p.PROPRECOVENDA > 0'

  if (req.query.categoria_id) {
    request.input('categoria_id', sql.UniqueIdentifier, req.query.categoria_id as string)
    where += ' AND p.PROIDCATEGORIA = @categoria_id'
  }

  const result = await request.query(`
    SELECT
      p.PROIDPRODUTO,
      p.PRONOME,
      p.PROSKU,
      p.PRODESCRICAO,
      p.PROPRECOVENDA,
      c.CATNOME AS categoria_nome,
      u.UNISIGLA AS unidade_sigla
    FROM PRODUTOS p
    LEFT JOIN CATEGORIAS c ON c.CATIDCATEGORIA = p.PROIDCATEGORIA
    LEFT JOIN UNIDADESMEDIDA u ON u.UNIIDUNIDADE = p.PROIDUNIDADE
    ${where}
    ORDER BY c.CATNOME, p.PRONOME
  `)

  const produtos = result.recordset.map((r: any) => ({
    id: r.PROIDPRODUTO,
    nome: r.PRONOME,
    sku: r.PROSKU,
    descricao: r.PRODESCRICAO,
    categoria: r.categoria_nome || 'Sem categoria',
    unidade: r.unidade_sigla || 'un',
    preco_venda: r.PROPRECOVENDA,
  }))

  res.json({ produtos })
}))

// ── GET /api/v1/reports/movements ──────────────────────────
router.get('/movements', asyncHandler(async (req: AuthRequest, res: Response) => {
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
  if (req.query.operacao) {
    request.input('operacao', sql.Char(1), req.query.operacao as string)
    where += ' AND t.TIMOPERACAO = @operacao'
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
    SELECT
      m.MOVIDMOVIMENTACAO,
      m.MOVQUANTIDADE,
      m.MOVJUSTIFICATIVA,
      m.MOVOBSERVACAO,
      m.MOVDATACADASTRO,
      p.PRONOME       AS produto_nome,
      p.PROSKU        AS produto_sku,
      t.TIMCODIGO     AS tipo_codigo,
      t.TIMDESCRICAO  AS tipo_descricao,
      t.TIMOPERACAO   AS tipo_operacao
    FROM MOVIMENTACOES m
    INNER JOIN PRODUTOS          p ON p.PROIDPRODUTO = m.MOVIDPRODUTO
    INNER JOIN TIPOSMOVIMENTACAO t ON t.TIMIDTIPO    = m.MOVIDTIPO
    ${where}
    ORDER BY m.MOVDATACADASTRO DESC
  `)

  let totalEntradas = 0
  let totalSaidas = 0
  let qtdEntradas = 0
  let qtdSaidas = 0

  const movimentacoes = result.recordset.map((r: any) => {
    if (r.tipo_operacao === '+') {
      totalEntradas++
      qtdEntradas += r.MOVQUANTIDADE
    } else {
      totalSaidas++
      qtdSaidas += r.MOVQUANTIDADE
    }

    return {
      id: r.MOVIDMOVIMENTACAO,
      data: r.MOVDATACADASTRO,
      produto: r.produto_nome,
      sku: r.produto_sku,
      tipo_codigo: r.tipo_codigo,
      tipo_descricao: r.tipo_descricao,
      operacao: r.tipo_operacao as '+' | '-',
      quantidade: r.MOVQUANTIDADE,
      justificativa: r.MOVJUSTIFICATIVA,
      observacao: r.MOVOBSERVACAO,
    }
  })

  res.json({
    movimentacoes,
    totais: {
      total: movimentacoes.length,
      total_entradas: totalEntradas,
      total_saidas: totalSaidas,
      qtd_entradas: qtdEntradas,
      qtd_saidas: qtdSaidas,
    },
  })
}))

export default router
