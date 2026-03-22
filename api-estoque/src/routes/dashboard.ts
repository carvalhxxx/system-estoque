import { Router, Response } from 'express'
import { getPool, sql } from '../config/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

// ── GET /api/v1/dashboard/stats ──────────────────────────────
router.get('/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('uid', sql.UniqueIdentifier, req.userId)
    .query(`
      SELECT
        (SELECT COUNT(*) FROM PRODUTOS WHERE PROIDUSUARIOCADASTRO = @uid AND PROATIVO = 1) AS totalProdutosAtivos,
        (SELECT COUNT(*) FROM PRODUTOS WHERE PROIDUSUARIOCADASTRO = @uid AND PROATIVO = 1 AND PROESTOQUEATUAL <= PROESTOQUEMINIMO) AS totalEstoqueBaixo,
        (SELECT COUNT(*) FROM CATEGORIAS WHERE CATIDUSUARIOCADASTRO = @uid AND CATATIVO = 1) AS totalCategorias,
        (SELECT COUNT(*) FROM MOVIMENTACOES WHERE MOVIDUSUARIOCADASTRO = @uid) AS totalMovimentacoes,
        (SELECT COUNT(*) FROM MOVIMENTACOES m INNER JOIN TIPOSMOVIMENTACAO t ON t.TIMIDTIPO = m.MOVIDTIPO WHERE m.MOVIDUSUARIOCADASTRO = @uid AND t.TIMOPERACAO = '+' AND m.MOVDATACADASTRO >= CAST(GETDATE() AS DATE)) AS entradasHoje,
        (SELECT COUNT(*) FROM MOVIMENTACOES m INNER JOIN TIPOSMOVIMENTACAO t ON t.TIMIDTIPO = m.MOVIDTIPO WHERE m.MOVIDUSUARIOCADASTRO = @uid AND t.TIMOPERACAO = '-' AND m.MOVDATACADASTRO >= CAST(GETDATE() AS DATE)) AS saidasHoje
    `)

  res.json(result.recordset[0])
}))

// ── GET /api/v1/dashboard/low-stock ──────────────────────────
router.get('/low-stock', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('uid', sql.UniqueIdentifier, req.userId)
    .query(`
      SELECT TOP 10
        p.PROIDPRODUTO, p.PRONOME, p.PROSKU, p.PROESTOQUEATUAL, p.PROESTOQUEMINIMO,
        c.CATNOME AS categoria_nome
      FROM PRODUTOS p
      LEFT JOIN CATEGORIAS c ON c.CATIDCATEGORIA = p.PROIDCATEGORIA
      WHERE p.PROIDUSUARIOCADASTRO = @uid
        AND p.PROATIVO = 1
        AND p.PROESTOQUEATUAL <= p.PROESTOQUEMINIMO
      ORDER BY (p.PROESTOQUEATUAL - p.PROESTOQUEMINIMO) ASC
    `)

  res.json(result.recordset)
}))

// ── GET /api/v1/dashboard/recent-movements ───────────────────
router.get('/recent-movements', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('uid', sql.UniqueIdentifier, req.userId)
    .query(`
      SELECT TOP 10
        m.MOVIDMOVIMENTACAO, m.MOVQUANTIDADE, m.MOVDATACADASTRO,
        p.PRONOME AS produto_nome, p.PROSKU AS produto_sku,
        t.TIMCODIGO AS tipo_codigo, t.TIMOPERACAO AS tipo_operacao
      FROM MOVIMENTACOES m
      INNER JOIN PRODUTOS p ON p.PROIDPRODUTO = m.MOVIDPRODUTO
      INNER JOIN TIPOSMOVIMENTACAO t ON t.TIMIDTIPO = m.MOVIDTIPO
      WHERE m.MOVIDUSUARIOCADASTRO = @uid
      ORDER BY m.MOVDATACADASTRO DESC
    `)

  res.json(result.recordset)
}))

// ── GET /api/v1/dashboard/stock-by-category ─────────────────
router.get('/stock-by-category', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('uid', sql.UniqueIdentifier, req.userId)
    .query(`
      SELECT
        ISNULL(c.CATNOME, 'Sem categoria') AS categoria,
        COUNT(*) AS total_produtos,
        SUM(p.PROESTOQUEATUAL) AS total_estoque,
        SUM(p.PROESTOQUEATUAL * ISNULL(p.PROPRECOVENDA, 0)) AS valor_total
      FROM PRODUTOS p
      LEFT JOIN CATEGORIAS c ON c.CATIDCATEGORIA = p.PROIDCATEGORIA
      WHERE p.PROIDUSUARIOCADASTRO = @uid AND p.PROATIVO = 1
      GROUP BY c.CATNOME
      ORDER BY total_estoque DESC
    `)

  res.json(result.recordset)
}))

// ── GET /api/v1/dashboard/movement-trends ───────────────────
router.get('/movement-trends', asyncHandler(async (req: AuthRequest, res: Response) => {
  const pool = await getPool()

  const result = await pool.request()
    .input('uid', sql.UniqueIdentifier, req.userId)
    .query(`
      ;WITH Meses AS (
        SELECT 0 AS n
        UNION ALL SELECT n + 1 FROM Meses WHERE n < 11
      ),
      MesesRange AS (
        SELECT
          DATEADD(MONTH, -n, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS mes_inicio,
          EOMONTH(DATEADD(MONTH, -n, GETDATE())) AS mes_fim,
          n
        FROM Meses
      )
      SELECT
        FORMAT(mr.mes_inicio, 'yyyy-MM') AS mes,
        FORMAT(mr.mes_inicio, 'MMM', 'pt-BR') AS mes_label,
        ISNULL(SUM(CASE WHEN t.TIMOPERACAO = '+' THEN m.MOVQUANTIDADE END), 0) AS entradas,
        ISNULL(SUM(CASE WHEN t.TIMOPERACAO = '-' THEN m.MOVQUANTIDADE END), 0) AS saidas,
        ISNULL(COUNT(CASE WHEN t.TIMOPERACAO = '+' THEN 1 END), 0) AS total_entradas,
        ISNULL(COUNT(CASE WHEN t.TIMOPERACAO = '-' THEN 1 END), 0) AS total_saidas
      FROM MesesRange mr
      LEFT JOIN MOVIMENTACOES m
        ON m.MOVIDUSUARIOCADASTRO = @uid
        AND m.MOVDATACADASTRO >= mr.mes_inicio
        AND m.MOVDATACADASTRO <= DATEADD(DAY, 1, mr.mes_fim)
      LEFT JOIN TIPOSMOVIMENTACAO t ON t.TIMIDTIPO = m.MOVIDTIPO
      GROUP BY mr.mes_inicio, mr.n
      ORDER BY mr.mes_inicio ASC
    `)

  res.json(result.recordset)
}))

export default router
