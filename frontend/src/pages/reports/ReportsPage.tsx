import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, Users, BarChart3, ArrowLeftRight, FileSpreadsheet, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import CollapsibleFilter from '../../components/CollapsibleFilter'
import { reportService } from '../../services/report_service'
import { categoryService } from '../../services/category_service'
import { productService } from '../../services/product_service'
import { movementTypeService } from '../../services/movementType_service'
import type {
  ProdutoRelatorioInterno, TotaisRelatorio, ProdutoRelatorioCliente,
  MovimentacaoRelatorio, TotaisMovimentacao, FiltrosRelatorioMov,
} from '../../services/report_service'
import SelectModal from '../../components/SelectModal'
import { exportPdf, exportExcel } from '../../lib/exportUtils'

// ── Helpers ──────────────────────────────────────────────────
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtQty(v: number) {
  return v % 1 === 0 ? v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}
function today() {
  return new Date().toLocaleDateString('pt-BR')
}
function fmtDateTime(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
function fmtDate(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

// ── Print helpers ────────────────────────────────────────────
function openPrintWindow(title: string, html: string, landscape = true) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) {
    toast.error('Permita pop-ups para exportar o relatório.')
    return
  }
  w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Helvetica, 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 24px; font-size: 10px; line-height: 1.4; }
    h1 { font-size: 16px; margin-bottom: 2px; font-weight: 700; letter-spacing: -0.3px; }
    .subtitle { font-size: 10px; color: #666; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { padding: 4px 6px; text-align: left; border-bottom: 1px solid #ddd; }
    th { font-size: 8px; text-transform: uppercase; letter-spacing: 0.6px; color: #555; font-weight: 700; border-bottom: 2px solid #333; padding-bottom: 5px; }
    td { font-size: 9px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-green { color: #15803d; }
    .text-red { color: #b91c1c; }
    .text-muted { color: #888; font-size: 9px; }
    .totals-row td { font-weight: 700; border-top: 2px solid #333; border-bottom: none; background: #f5f5f5; font-size: 9px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 16px; }
    .summary-card { border: 1px solid #ddd; border-radius: 3px; padding: 8px; text-align: center; }
    .summary-card .value { font-size: 14px; font-weight: 700; }
    .summary-card .label { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .cat-header { background: #e8e8e8; font-weight: 600; font-size: 10px; }
    .cat-header td { padding: 6px; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 2px; font-size: 8px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-red { background: #fee2e2; color: #b91c1c; }

    /* Movimentacoes - layout denso A4 */
    .mov-header { margin-bottom: 10px; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; }
    .mov-header h1 { font-size: 14px; }
    .mov-subtitle { font-size: 9px; color: #555; margin-top: 2px; }
    .mov-summary { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 6px 0; border-bottom: 1px solid #ddd; }
    .mov-summary-item { display: flex; align-items: center; gap: 4px; }
    .mov-summary-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600; }
    .mov-summary-value { font-size: 10px; font-weight: 700; }
    .mov-summary-sep { color: #ccc; font-size: 10px; }
    .mov-table th, .mov-table td { padding: 3px 5px; }
    .mov-table td { font-size: 8.5px; border-bottom: 1px solid #eee; }
    .mov-table th { font-size: 7.5px; padding-bottom: 4px; }
    .mov-table tbody tr:hover { background: #fafafa; }
    .col-seq { width: 24px; text-align: center; color: #999; font-size: 7.5px; }
    .col-date { width: 95px; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .col-sku { width: 70px; font-family: 'Courier New', monospace; font-size: 8px; color: #555; }
    .col-product { min-width: 100px; }
    .col-type { width: 22px; text-align: center; }
    .col-qty { width: 55px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    .col-reason { color: #444; font-size: 8px; }
    .arrow-up { color: #15803d; font-size: 7px; }
    .arrow-down { color: #b91c1c; font-size: 7px; }
    .mov-table .totals-row td { font-size: 8.5px; padding: 5px; }

    .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8px; color: #999; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      @page { margin: 12mm 10mm; size: A4 ${landscape ? 'landscape' : 'portrait'}; }
      .mov-table tbody tr:hover { background: none; }
    }
  </style>
</head>
<body>
  ${html}
  <div class="footer">
    <span>Gerado em ${today()} - Sistema de Estoque</span>
    <span>Pagina 1</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`)
  w.document.close()
}

function buildInternalReport(produtos: ProdutoRelatorioInterno[], totais: TotaisRelatorio) {
  const grouped = new Map<string, ProdutoRelatorioInterno[]>()
  for (const p of produtos) {
    const cat = p.categoria
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(p)
  }

  const summaryHtml = `
    <div class="summary-grid">
      <div class="summary-card"><div class="value">${totais.total_produtos}</div><div class="label">Produtos</div></div>
      <div class="summary-card"><div class="value">${fmtQty(totais.total_pecas)}</div><div class="label">Total de Pecas</div></div>
      <div class="summary-card"><div class="value">${fmtCurrency(totais.total_custo)}</div><div class="label">Valor em Custo</div></div>
      <div class="summary-card"><div class="value">${fmtCurrency(totais.total_venda)}</div><div class="label">Valor em Venda</div></div>
      <div class="summary-card"><div class="value ${totais.lucro_total >= 0 ? 'text-green' : 'text-red'}">${fmtCurrency(totais.lucro_total)}</div><div class="label">Lucro Total</div></div>
    </div>
  `

  let tableRows = ''
  for (const [cat, prods] of grouped) {
    tableRows += `<tr class="cat-header"><td colspan="10">${cat}</td></tr>`
    for (const p of prods) {
      tableRows += `
        <tr>
          <td>${p.sku || '—'}</td>
          <td>${p.nome}</td>
          <td class="text-center">${p.unidade}</td>
          <td class="text-right">${fmtQty(p.estoque_atual)}</td>
          <td class="text-right">${fmtQty(p.estoque_minimo)}</td>
          <td class="text-right">${fmtCurrency(p.preco_custo)}</td>
          <td class="text-right">${fmtCurrency(p.preco_venda)}</td>
          <td class="text-right">${fmtCurrency(p.valor_total_custo)}</td>
          <td class="text-right">${fmtCurrency(p.valor_total_venda)}</td>
          <td class="text-right ${p.lucro_total >= 0 ? 'text-green' : 'text-red'}">${fmtCurrency(p.lucro_total)}</td>
        </tr>`
    }
  }

  return `
    <h1>Relatorio Interno de Estoque</h1>
    <div class="subtitle">Data: ${today()}</div>
    ${summaryHtml}
    <table>
      <thead><tr>
        <th>SKU</th><th>Produto</th><th class="text-center">Un.</th><th class="text-right">Estoque</th>
        <th class="text-right">Est. Min.</th><th class="text-right">Preco Custo</th><th class="text-right">Preco Venda</th>
        <th class="text-right">Total Custo</th><th class="text-right">Total Venda</th><th class="text-right">Lucro</th>
      </tr></thead>
      <tbody>
        ${tableRows}
        <tr class="totals-row">
          <td colspan="3">TOTAL</td>
          <td class="text-right">${fmtQty(totais.total_pecas)}</td><td></td><td></td><td></td>
          <td class="text-right">${fmtCurrency(totais.total_custo)}</td>
          <td class="text-right">${fmtCurrency(totais.total_venda)}</td>
          <td class="text-right ${totais.lucro_total >= 0 ? 'text-green' : 'text-red'}">${fmtCurrency(totais.lucro_total)}</td>
        </tr>
      </tbody>
    </table>`
}

function buildClientReport(produtos: ProdutoRelatorioCliente[], nomeEmpresa: string) {
  const grouped = new Map<string, ProdutoRelatorioCliente[]>()
  for (const p of produtos) {
    const cat = p.categoria
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(p)
  }

  let tableRows = ''
  for (const [cat, prods] of grouped) {
    tableRows += `<tr class="cat-header"><td colspan="5">${cat}</td></tr>`
    for (const p of prods) {
      tableRows += `
        <tr>
          <td>${p.sku || '—'}</td>
          <td>${p.nome}</td>
          <td>${p.descricao || '—'}</td>
          <td class="text-center">${p.unidade}</td>
          <td class="text-right">${fmtCurrency(p.preco_venda)}</td>
        </tr>`
    }
  }

  return `
    <h1>${nomeEmpresa || 'Catalogo de Produtos'}</h1>
    <div class="subtitle">Lista de Produtos - ${today()}</div>
    <table>
      <thead><tr><th>Codigo</th><th>Produto</th><th>Descricao</th><th class="text-center">Unidade</th><th class="text-right">Valor</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div style="margin-top: 12px; font-size: 10px; color: #888;">Total de ${produtos.length} produto${produtos.length !== 1 ? 's' : ''}</div>`
}

function buildMovementsReport(movimentacoes: MovimentacaoRelatorio[], totais: TotaisMovimentacao, filtroTexto: string) {
  const periodo = filtroTexto || 'Todas as movimentacoes'

  const summaryHtml = `
    <div class="mov-summary">
      <div class="mov-summary-item">
        <span class="mov-summary-label">Total</span>
        <span class="mov-summary-value">${totais.total}</span>
      </div>
      <span class="mov-summary-sep">|</span>
      <div class="mov-summary-item">
        <span class="mov-summary-label">Entradas</span>
        <span class="mov-summary-value text-green">${totais.total_entradas} (${fmtQty(totais.qtd_entradas)} un.)</span>
      </div>
      <span class="mov-summary-sep">|</span>
      <div class="mov-summary-item">
        <span class="mov-summary-label">Saidas</span>
        <span class="mov-summary-value text-red">${totais.total_saidas} (${fmtQty(totais.qtd_saidas)} un.)</span>
      </div>
    </div>
  `

  let tableRows = ''
  movimentacoes.forEach((m, i) => {
    const isEntrada = m.operacao === '+'
    const arrow = isEntrada
      ? '<span class="arrow-up">&#9650;</span>'
      : '<span class="arrow-down">&#9660;</span>'
    const qtyClass = isEntrada ? 'text-green' : 'text-red'
    const qtySign = isEntrada ? '+' : '-'
    tableRows += `
      <tr>
        <td class="col-seq">${i + 1}</td>
        <td class="col-date">${fmtDateTime(m.data)}</td>
        <td class="col-sku">${m.sku || '—'}</td>
        <td class="col-product">${m.produto}</td>
        <td class="col-type">${arrow}</td>
        <td class="col-qty ${qtyClass}">${qtySign}${fmtQty(m.quantidade)}</td>
        <td class="col-reason">${m.justificativa || m.tipo_descricao}</td>
      </tr>`
  })

  return `
    <div class="mov-header">
      <h1>Relatorio Detalhado de Movimentacoes</h1>
      <div class="mov-subtitle">${periodo}</div>
    </div>
    ${summaryHtml}
    <table class="mov-table">
      <thead><tr>
        <th class="col-seq">#</th>
        <th class="col-date">Data/Hora</th>
        <th class="col-sku">SKU</th>
        <th class="col-product">Produto</th>
        <th class="col-type">Tipo</th>
        <th class="col-qty">Qtd.</th>
        <th class="col-reason">Motivo</th>
      </tr></thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td colspan="4">TOTAL: ${totais.total} movimentacao${totais.total !== 1 ? 'es' : ''}</td>
          <td class="col-type"></td>
          <td class="col-qty">${fmtQty(totais.qtd_entradas + totais.qtd_saidas)}</td>
          <td>Entradas: ${fmtQty(totais.qtd_entradas)} | Saidas: ${fmtQty(totais.qtd_saidas)}</td>
        </tr>
      </tfoot>
    </table>`
}

// ── Componente principal ─────────────────────────────────────
type TabType = 'internal' | 'client' | 'movements'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('internal')

  // Filtros estoque
  const [categoriaId, setCategoriaId] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('')

  // Filtros movimentações
  const [movProdutoId, setMovProdutoId] = useState('')
  const [movTipoId, setMovTipoId] = useState('')
  const [movOperacao, setMovOperacao] = useState<'' | '+' | '-'>('')
  const [movDataInicio, setMovDataInicio] = useState('')
  const [movDataFim, setMovDataFim] = useState('')

  // Queries de apoio
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => categoryService.getAll(),
  })
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-ativos'],
    queryFn: () => productService.getActive(),
    enabled: activeTab === 'movements',
  })
  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos-movimentacao'],
    queryFn: () => movementTypeService.getActive(),
    enabled: activeTab === 'movements',
  })

  // Queries de relatório
  const { data: relatorioInterno, isLoading: loadingInterno, refetch: refetchInterno } = useQuery({
    queryKey: ['relatorio-interno', categoriaId],
    queryFn: () => reportService.getInternal(categoriaId || undefined),
    enabled: activeTab === 'internal',
  })
  const { data: relatorioCliente, isLoading: loadingCliente, refetch: refetchCliente } = useQuery({
    queryKey: ['relatorio-cliente', categoriaId],
    queryFn: () => reportService.getClient(categoriaId || undefined),
    enabled: activeTab === 'client',
  })

  const movFiltros: FiltrosRelatorioMov = {
    ...(movProdutoId ? { produto_id: movProdutoId } : {}),
    ...(movTipoId ? { tipo_id: movTipoId } : {}),
    ...(movOperacao ? { operacao: movOperacao } : {}),
    ...(movDataInicio ? { data_inicio: movDataInicio } : {}),
    ...(movDataFim ? { data_fim: movDataFim } : {}),
  }

  const { data: relatorioMov, isLoading: loadingMov, refetch: refetchMov } = useQuery({
    queryKey: ['relatorio-movimentacoes', movFiltros],
    queryFn: () => reportService.getMovements(movFiltros),
    enabled: activeTab === 'movements',
  })

  // Options para SelectModal
  const catOptions = categorias.map(c => ({ id: c.CATIDCATEGORIA, label: c.CATNOME }))
  const prodOptions = produtos.map(p => ({ id: p.PROIDPRODUTO, label: p.PRONOME, sub: p.PROSKU || undefined }))
  const tipoOptions = tipos.map(t => ({ id: t.TIMIDTIPO, label: t.TIMDESCRICAO, sub: t.TIMOPERACAO === '+' ? 'Entrada' : 'Saída' }))

  // ── Helpers de filtro texto movimentações ────────────────
  function getMovFilterText() {
    const parts: string[] = []
    if (movDataInicio && movDataFim) parts.push(`Periodo: ${fmtDate(movDataInicio + 'T00:00:00')} a ${fmtDate(movDataFim + 'T00:00:00')}`)
    else if (movDataInicio) parts.push(`A partir de ${fmtDate(movDataInicio + 'T00:00:00')}`)
    else if (movDataFim) parts.push(`Ate ${fmtDate(movDataFim + 'T00:00:00')}`)
    if (movProdutoId) { const p = produtos.find(x => x.PROIDPRODUTO === movProdutoId); if (p) parts.push(`Produto: ${p.PRONOME}`) }
    if (movTipoId) { const t = tipos.find(x => x.TIMIDTIPO === movTipoId); if (t) parts.push(`Tipo: ${t.TIMDESCRICAO}`) }
    if (movOperacao) parts.push(`Operacao: ${movOperacao === '+' ? 'Entrada' : 'Saida'}`)
    return parts.join(' | ')
  }

  // ── Print ───────────────────────────────────────────────
  function handlePrintInternal() {
    if (!relatorioInterno) { refetchInterno(); toast.error('Aguarde o carregamento dos dados.'); return }
    openPrintWindow('Relatorio Interno de Estoque', buildInternalReport(relatorioInterno.produtos, relatorioInterno.totais))
  }
  function handlePrintClient() {
    if (!relatorioCliente) { refetchCliente(); toast.error('Aguarde o carregamento dos dados.'); return }
    openPrintWindow('Catalogo de Produtos', buildClientReport(relatorioCliente.produtos, nomeEmpresa), false)
  }
  function handlePrintMovements() {
    if (!relatorioMov) { refetchMov(); toast.error('Aguarde o carregamento dos dados.'); return }
    openPrintWindow('Relatorio de Movimentacoes', buildMovementsReport(relatorioMov.movimentacoes, relatorioMov.totais, getMovFilterText()))
  }

  // ── PDF ─────────────────────────────────────────────────
  function handlePdfInternal() {
    if (!relatorioInterno) { refetchInterno(); toast.error('Aguarde o carregamento dos dados.'); return }
    const { produtos: prods, totais: t } = relatorioInterno
    exportPdf({
      title: 'Relatorio Interno de Estoque',
      subtitle: `Data: ${today()}`,
      landscape: true,
      summaryCards: [
        { label: 'Produtos', value: String(t.total_produtos) },
        { label: 'Pecas', value: fmtQty(t.total_pecas) },
        { label: 'Total Custo', value: fmtCurrency(t.total_custo) },
        { label: 'Total Venda', value: fmtCurrency(t.total_venda) },
        { label: 'Lucro Total', value: fmtCurrency(t.lucro_total) },
      ],
      columns: [
        { header: 'SKU', dataKey: 'sku' },
        { header: 'Produto', dataKey: 'nome' },
        { header: 'Categoria', dataKey: 'categoria' },
        { header: 'Un.', dataKey: 'unidade', align: 'center' },
        { header: 'Estoque', dataKey: 'estoque_atual', align: 'right' },
        { header: 'Est. Min.', dataKey: 'estoque_minimo', align: 'right' },
        { header: 'P. Custo', dataKey: 'preco_custo_fmt', align: 'right' },
        { header: 'P. Venda', dataKey: 'preco_venda_fmt', align: 'right' },
        { header: 'Total Custo', dataKey: 'valor_total_custo_fmt', align: 'right' },
        { header: 'Total Venda', dataKey: 'valor_total_venda_fmt', align: 'right' },
        { header: 'Lucro', dataKey: 'lucro_total_fmt', align: 'right' },
      ],
      rows: prods.map(p => ({
        sku: p.sku || '—', nome: p.nome, categoria: p.categoria, unidade: p.unidade,
        estoque_atual: fmtQty(p.estoque_atual), estoque_minimo: fmtQty(p.estoque_minimo),
        preco_custo_fmt: fmtCurrency(p.preco_custo), preco_venda_fmt: fmtCurrency(p.preco_venda),
        valor_total_custo_fmt: fmtCurrency(p.valor_total_custo), valor_total_venda_fmt: fmtCurrency(p.valor_total_venda),
        lucro_total_fmt: fmtCurrency(p.lucro_total),
      })),
      totalsRow: {
        sku: '', nome: '', categoria: 'TOTAL', unidade: '', estoque_atual: fmtQty(t.total_pecas), estoque_minimo: '',
        preco_custo_fmt: '', preco_venda_fmt: '',
        valor_total_custo_fmt: fmtCurrency(t.total_custo), valor_total_venda_fmt: fmtCurrency(t.total_venda),
        lucro_total_fmt: fmtCurrency(t.lucro_total),
      },
    })
  }

  function handlePdfClient() {
    if (!relatorioCliente) { refetchCliente(); toast.error('Aguarde o carregamento dos dados.'); return }
    exportPdf({
      title: nomeEmpresa || 'Catalogo de Produtos',
      subtitle: `Lista de Produtos - ${today()}`,
      landscape: false,
      columns: [
        { header: 'Codigo', dataKey: 'sku' },
        { header: 'Produto', dataKey: 'nome' },
        { header: 'Descricao', dataKey: 'descricao' },
        { header: 'Unidade', dataKey: 'unidade', align: 'center' },
        { header: 'Valor', dataKey: 'preco_venda_fmt', align: 'right' },
      ],
      rows: relatorioCliente.produtos.map(p => ({
        sku: p.sku || '—', nome: p.nome, descricao: p.descricao || '—', unidade: p.unidade,
        preco_venda_fmt: fmtCurrency(p.preco_venda),
      })),
    })
  }

  function handlePdfMovements() {
    if (!relatorioMov) { refetchMov(); toast.error('Aguarde o carregamento dos dados.'); return }
    const { movimentacoes: movs, totais: t } = relatorioMov
    exportPdf({
      title: 'Relatorio Detalhado de Movimentacoes',
      subtitle: getMovFilterText() || 'Todas as movimentacoes',
      landscape: true,
      summaryCards: [
        { label: 'Total', value: String(t.total) },
        { label: 'Entradas', value: `${t.total_entradas} (${fmtQty(t.qtd_entradas)} un.)` },
        { label: 'Saidas', value: `${t.total_saidas} (${fmtQty(t.qtd_saidas)} un.)` },
      ],
      columns: [
        { header: '#', dataKey: 'seq', align: 'center' },
        { header: 'Data/Hora', dataKey: 'data_fmt' },
        { header: 'SKU', dataKey: 'sku' },
        { header: 'Produto', dataKey: 'produto' },
        { header: 'Tipo', dataKey: 'operacao_fmt', align: 'center' },
        { header: 'Qtd.', dataKey: 'quantidade_fmt', align: 'right' },
        { header: 'Motivo', dataKey: 'motivo' },
      ],
      rows: movs.map((m, i) => ({
        seq: String(i + 1),
        data_fmt: fmtDateTime(m.data), produto: m.produto, sku: m.sku || '—',
        operacao_fmt: m.operacao === '+' ? '▲' : '▼',
        quantidade_fmt: `${m.operacao === '+' ? '+' : '-'}${fmtQty(m.quantidade)}`,
        motivo: m.justificativa || m.tipo_descricao,
      })),
      totalsRow: {
        seq: '', data_fmt: '', sku: '', produto: 'TOTAL', operacao_fmt: '',
        quantidade_fmt: fmtQty(t.qtd_entradas + t.qtd_saidas),
        motivo: `Entradas: ${fmtQty(t.qtd_entradas)} | Saidas: ${fmtQty(t.qtd_saidas)}`,
      },
    })
  }

  // ── Excel ───────────────────────────────────────────────
  function handleExcelInternal() {
    if (!relatorioInterno) { refetchInterno(); toast.error('Aguarde o carregamento dos dados.'); return }
    const { produtos: prods, totais: t } = relatorioInterno
    exportExcel({
      filename: 'Relatorio_Interno_Estoque',
      sheetName: 'Estoque',
      columns: [
        { header: 'SKU', key: 'sku', width: 14 },
        { header: 'Produto', key: 'nome', width: 30 },
        { header: 'Categoria', key: 'categoria', width: 18 },
        { header: 'Unidade', key: 'unidade', width: 10 },
        { header: 'Estoque Atual', key: 'estoque_atual', width: 14 },
        { header: 'Estoque Minimo', key: 'estoque_minimo', width: 14 },
        { header: 'Preco Custo', key: 'preco_custo', width: 14 },
        { header: 'Preco Venda', key: 'preco_venda', width: 14 },
        { header: 'Total Custo', key: 'valor_total_custo', width: 14 },
        { header: 'Total Venda', key: 'valor_total_venda', width: 14 },
        { header: 'Lucro', key: 'lucro_total', width: 14 },
      ],
      rows: prods.map(p => ({
        sku: p.sku, nome: p.nome, categoria: p.categoria, unidade: p.unidade,
        estoque_atual: p.estoque_atual, estoque_minimo: p.estoque_minimo,
        preco_custo: p.preco_custo, preco_venda: p.preco_venda,
        valor_total_custo: p.valor_total_custo, valor_total_venda: p.valor_total_venda,
        lucro_total: p.lucro_total,
      })),
      totalsRow: {
        sku: '', nome: '', categoria: 'TOTAL', unidade: '', estoque_atual: t.total_pecas, estoque_minimo: '',
        preco_custo: '', preco_venda: '',
        valor_total_custo: t.total_custo, valor_total_venda: t.total_venda,
        lucro_total: t.lucro_total,
      },
    })
  }

  function handleExcelClient() {
    if (!relatorioCliente) { refetchCliente(); toast.error('Aguarde o carregamento dos dados.'); return }
    exportExcel({
      filename: 'Catalogo_Produtos',
      sheetName: 'Catalogo',
      columns: [
        { header: 'Codigo', key: 'sku', width: 14 },
        { header: 'Produto', key: 'nome', width: 30 },
        { header: 'Descricao', key: 'descricao', width: 35 },
        { header: 'Unidade', key: 'unidade', width: 10 },
        { header: 'Valor', key: 'preco_venda', width: 14 },
      ],
      rows: relatorioCliente.produtos.map(p => ({
        sku: p.sku, nome: p.nome, descricao: p.descricao, unidade: p.unidade,
        preco_venda: p.preco_venda,
      })),
    })
  }

  function handleExcelMovements() {
    if (!relatorioMov) { refetchMov(); toast.error('Aguarde o carregamento dos dados.'); return }
    const { movimentacoes: movs, totais: t } = relatorioMov
    exportExcel({
      filename: 'Relatorio_Movimentacoes',
      sheetName: 'Movimentacoes',
      columns: [
        { header: '#', key: 'seq', width: 6 },
        { header: 'Data/Hora', key: 'data_fmt', width: 18 },
        { header: 'SKU', key: 'sku', width: 14 },
        { header: 'Produto', key: 'produto', width: 28 },
        { header: 'Tipo', key: 'operacao_fmt', width: 10 },
        { header: 'Qtd.', key: 'quantidade', width: 12 },
        { header: 'Motivo', key: 'motivo', width: 30 },
      ],
      rows: movs.map((m, i) => ({
        seq: i + 1, data_fmt: fmtDateTime(m.data), sku: m.sku, produto: m.produto,
        operacao_fmt: m.operacao === '+' ? 'Entrada' : 'Saida',
        quantidade: m.quantidade, motivo: m.justificativa || m.tipo_descricao,
      })),
      totalsRow: {
        seq: '', data_fmt: '', sku: '', produto: 'TOTAL', operacao_fmt: '',
        quantidade: t.qtd_entradas + t.qtd_saidas, motivo: `Entradas: ${fmtQty(t.qtd_entradas)} | Saidas: ${fmtQty(t.qtd_saidas)}`,
      },
    })
  }

  const temFiltroMov = movProdutoId || movTipoId || movOperacao || movDataInicio || movDataFim

  const totais = relatorioInterno?.totais
  const totaisMov = relatorioMov?.totais

  const tabs: { key: TabType; label: string; shortLabel: string; icon: typeof BarChart3 }[] = [
    { key: 'internal', label: 'Relatório Interno', shortLabel: 'Interno', icon: BarChart3 },
    { key: 'client', label: 'Catálogo para Cliente', shortLabel: 'Cliente', icon: Users },
    { key: 'movements', label: 'Movimentações', shortLabel: 'Mov.', icon: ArrowLeftRight },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Relatorios</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          Tab: Relatório Interno
         ══════════════════════════════════════════════════════════ */}
      {activeTab === 'internal' && (
        <>
          <CollapsibleFilter hasActiveFilters={!!categoriaId}>
            <SelectModal label="Filtrar por Categoria" placeholder="Todas as categorias" emptyLabel="Todas" value={categoriaId} options={catOptions} onChange={setCategoriaId} />
          </CollapsibleFilter>

          {totais && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="card p-3 sm:p-4"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Produtos</p><p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{totais.total_produtos}</p></div>
              <div className="card p-3 sm:p-4"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Pecas</p><p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{fmtQty(totais.total_pecas)}</p></div>
              <div className="card p-3 sm:p-4"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Total Custo</p><p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{fmtCurrency(totais.total_custo)}</p></div>
              <div className="card p-3 sm:p-4"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Total Venda</p><p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{fmtCurrency(totais.total_venda)}</p></div>
              <div className="card p-3 sm:p-4 col-span-2 sm:col-span-1"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Lucro Total</p><p className={`text-lg sm:text-xl font-bold truncate ${totais.lucro_total >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtCurrency(totais.lucro_total)}</p></div>
            </div>
          )}

          <div className="card overflow-hidden">
            {loadingInterno ? (
              <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
            ) : !relatorioInterno || relatorioInterno.produtos.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">Nenhum produto encontrado.</div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-slate-700">
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 hidden sm:table-cell">SKU</th>
                    <th className="px-4 py-3 text-center hidden lg:table-cell">Un.</th>
                    <th className="px-4 py-3 text-right">Estoque</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">P. Custo</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">P. Venda</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Total Custo</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Total Venda</th>
                    <th className="px-4 py-3 text-right">Lucro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {relatorioInterno.produtos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3"><div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{p.nome}</div><div className="text-xs text-gray-400 dark:text-slate-500">{p.categoria}</div></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 font-mono hidden sm:table-cell">{p.sku || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400 hidden lg:table-cell">{p.unidade}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmtQty(p.estoque_atual)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-slate-400 hidden sm:table-cell">{fmtCurrency(p.preco_custo)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-slate-400 hidden sm:table-cell">{fmtCurrency(p.preco_venda)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-slate-400 hidden md:table-cell">{fmtCurrency(p.valor_total_custo)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-slate-400 hidden md:table-cell">{fmtCurrency(p.valor_total_venda)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${p.lucro_total >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtCurrency(p.lucro_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={handlePrintInternal} disabled={loadingInterno || !relatorioInterno?.produtos.length} className="btn-secondary w-full sm:w-auto justify-center">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={handlePdfInternal} disabled={loadingInterno || !relatorioInterno?.produtos.length} className="btn-secondary w-full sm:w-auto justify-center">
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button onClick={handleExcelInternal} disabled={loadingInterno || !relatorioInterno?.produtos.length} className="btn-primary w-full sm:w-auto justify-center">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          Tab: Catálogo Cliente
         ══════════════════════════════════════════════════════════ */}
      {activeTab === 'client' && (
        <>
          <CollapsibleFilter hasActiveFilters={!!categoriaId || !!nomeEmpresa}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectModal label="Filtrar por Categoria" placeholder="Todas as categorias" emptyLabel="Todas" value={categoriaId} options={catOptions} onChange={setCategoriaId} />
              <div>
                <label className="label">Nome / Titulo do Catalogo</label>
                <input className="input-field" placeholder="Ex: Minha Empresa - Catalogo" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} />
              </div>
            </div>
          </CollapsibleFilter>

          <div className="card overflow-hidden">
            {loadingCliente ? (
              <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
            ) : !relatorioCliente || relatorioCliente.produtos.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">Nenhum produto com preco de venda encontrado.</div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-slate-700">
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Codigo</th>
                    <th className="px-4 py-3 hidden md:table-cell">Descricao</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Unidade</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {relatorioCliente.produtos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3"><div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{p.nome}</div><div className="text-xs text-gray-400 dark:text-slate-500">{p.categoria}</div></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 font-mono hidden sm:table-cell">{p.sku || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden md:table-cell truncate max-w-[200px]">{p.descricao || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400 hidden sm:table-cell">{p.unidade}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmtCurrency(p.preco_venda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>

          {relatorioCliente && relatorioCliente.produtos.length > 0 && (
            <div className="text-sm text-gray-500 dark:text-slate-400">
              {relatorioCliente.produtos.length} produto{relatorioCliente.produtos.length !== 1 ? 's' : ''} encontrado{relatorioCliente.produtos.length !== 1 ? 's' : ''}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={handlePrintClient} disabled={loadingCliente || !relatorioCliente?.produtos.length} className="btn-secondary w-full sm:w-auto justify-center">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={handlePdfClient} disabled={loadingCliente || !relatorioCliente?.produtos.length} className="btn-secondary w-full sm:w-auto justify-center">
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button onClick={handleExcelClient} disabled={loadingCliente || !relatorioCliente?.produtos.length} className="btn-primary w-full sm:w-auto justify-center">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          Tab: Movimentações
         ══════════════════════════════════════════════════════════ */}
      {activeTab === 'movements' && (
        <>
          {/* Filtros */}
          <CollapsibleFilter hasActiveFilters={!!temFiltroMov}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SelectModal label="Produto" placeholder="Todos os produtos" emptyLabel="Todos" value={movProdutoId} options={prodOptions} onChange={setMovProdutoId} />
              <SelectModal label="Tipo" placeholder="Todos os tipos" emptyLabel="Todos" value={movTipoId} options={tipoOptions} onChange={setMovTipoId} />
              <div>
                <label className="label">Operacao</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMovOperacao(v => v === '+' ? '' : '+')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      movOperacao === '+'
                        ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                        : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >+ Entrada</button>
                  <button
                    type="button"
                    onClick={() => setMovOperacao(v => v === '-' ? '' : '-')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      movOperacao === '-'
                        ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                        : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >- Saida</button>
                </div>
              </div>
              <div>
                <label className="label">Data Inicio</label>
                <input type="date" className="input-field" value={movDataInicio} onChange={e => setMovDataInicio(e.target.value)} />
              </div>
              <div>
                <label className="label">Data Fim</label>
                <input type="date" className="input-field" value={movDataFim} onChange={e => setMovDataFim(e.target.value)} />
              </div>
              {temFiltroMov && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => { setMovProdutoId(''); setMovTipoId(''); setMovOperacao(''); setMovDataInicio(''); setMovDataFim('') }}
                    className="btn-secondary w-full justify-center"
                  >Limpar Filtros</button>
                </div>
              )}
            </div>
          </CollapsibleFilter>

          {/* Cards resumo */}
          {totaisMov && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="card p-3 sm:p-4"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Total</p><p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{totaisMov.total}</p></div>
              <div className="card p-3 sm:p-4"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Entradas</p><p className="text-lg sm:text-xl font-bold text-green-600">{totaisMov.total_entradas}</p></div>
              <div className="card p-3 sm:p-4"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Saidas</p><p className="text-lg sm:text-xl font-bold text-red-600">{totaisMov.total_saidas}</p></div>
              <div className="card p-3 sm:p-4"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Qtd. Entrada</p><p className="text-lg sm:text-xl font-bold text-green-600">{fmtQty(totaisMov.qtd_entradas)}</p></div>
              <div className="card p-3 sm:p-4 col-span-2 sm:col-span-1"><p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">Qtd. Saida</p><p className="text-lg sm:text-xl font-bold text-red-600">{fmtQty(totaisMov.qtd_saidas)}</p></div>
            </div>
          )}

          {/* Tabela preview */}
          <div className="card overflow-hidden">
            {loadingMov ? (
              <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
            ) : !relatorioMov || relatorioMov.movimentacoes.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">Nenhuma movimentacao encontrada.</div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-slate-700">
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Tipo</th>
                    <th className="px-4 py-3">Operacao</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                    <th className="px-4 py-3 hidden md:table-cell">Justificativa</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Observacao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {relatorioMov.movimentacoes.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">{fmtDateTime(m.data)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{m.produto}</div>
                        {m.sku && <div className="text-xs text-gray-400 dark:text-slate-500 font-mono">{m.sku}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{m.tipo_descricao}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${m.operacao === '+' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {m.operacao === '+' ? '+ Entrada' : '- Saida'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmtQty(m.quantidade)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden md:table-cell truncate max-w-[150px]">{m.justificativa || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden lg:table-cell truncate max-w-[150px]">{m.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>

          {relatorioMov && relatorioMov.movimentacoes.length > 0 && (
            <div className="text-sm text-gray-500 dark:text-slate-400">
              {relatorioMov.movimentacoes.length} movimentacao{relatorioMov.movimentacoes.length !== 1 ? 'es' : ''}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={handlePrintMovements} disabled={loadingMov || !relatorioMov?.movimentacoes.length} className="btn-secondary w-full sm:w-auto justify-center">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={handlePdfMovements} disabled={loadingMov || !relatorioMov?.movimentacoes.length} className="btn-secondary w-full sm:w-auto justify-center">
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button onClick={handleExcelMovements} disabled={loadingMov || !relatorioMov?.movimentacoes.length} className="btn-primary w-full sm:w-auto justify-center">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
