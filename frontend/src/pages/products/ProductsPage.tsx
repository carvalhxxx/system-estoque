import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Eye, Search, AlertTriangle, ChevronLeft, ChevronRight, History } from 'lucide-react'
import SelectModal from '../../components/SelectModal'
import CollapsibleFilter from '../../components/CollapsibleFilter'
import toast from 'react-hot-toast'
import { productService } from '../../services/product_service'
import { categoryService } from '../../services/category_service'
import { unitService } from '../../services/unit_service'
import { dashboardService } from '../../services/dashboard_service'
import MovementHistory from '../../components/MovementHistory'
import type { Produto, Categoria, UnidadeMedida } from '../../types'

type ModalState =
  | { mode: 'new' }
  | { mode: 'view' | 'edit'; produto: Produto }

const POR_PAGINA = 15

// ── Helpers ──────────────────────────────────────────────────
function fmtMoeda(valor: number | null) {
  if (valor == null) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtQty(v: number) {
  return v % 1 === 0 ? v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min atras`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atras`
  const days = Math.floor(hrs / 24)
  return `${days}d atras`
}

function getStockStatus(produto: Produto) {
  if (produto.PROESTOQUEATUAL <= 0) return { label: 'Esgotado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  if (produto.PROESTOQUEATUAL <= produto.PROESTOQUEMINIMO) return { label: 'Baixo Estoque', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
  return { label: 'Em Estoque', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
}

// ── Modal ────────────────────────────────────────────────────
function ProdutoModal({
  state,
  categorias,
  unidades,
  onClose,
}: {
  state: ModalState
  categorias: Categoria[]
  unidades: UnidadeMedida[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const produto  = state.mode !== 'new' ? state.produto : undefined
  const readOnly = state.mode === 'view'

  const [nome, setNome]               = useState(produto?.PRONOME ?? '')
  const [sku, setSku]                 = useState(produto?.PROSKU ?? '')
  const [descricao, setDescricao]     = useState(produto?.PRODESCRICAO ?? '')
  const [unidadeId, setUnidadeId]     = useState(produto?.PROIDUNIDADE ?? '')
  const [precoCusto, setPrecoCusto]   = useState(produto?.PROPRECOCUSTO?.toString() ?? '')
  const [precoVenda, setPrecoVenda]   = useState(produto?.PROPRECOVENDA?.toString() ?? '')
  const [estoqueAtual, setEstoqueAtual]   = useState(produto?.PROESTOQUEATUAL?.toString() ?? '0')
  const [estoqueMinimo, setEstoqueMinimo] = useState(produto?.PROESTOQUEMINIMO?.toString() ?? '0')
  const [categoriaId, setCategoriaId] = useState(produto?.PROIDCATEGORIA ?? '')
  const [ativo, setAtivo]             = useState(produto?.PROATIVO ?? true)

  const salvar = useMutation({
    mutationFn: () => {
      const payload = {
        nome,
        sku: sku || null,
        descricao: descricao || null,
        unidade_id: unidadeId || null,
        preco_custo: precoCusto ? parseFloat(precoCusto) : null,
        preco_venda: precoVenda ? parseFloat(precoVenda) : null,
        estoque_atual: estoqueAtual ? parseFloat(estoqueAtual) : 0,
        estoque_minimo: estoqueMinimo ? parseFloat(estoqueMinimo) : 0,
        categoria_id: categoriaId || null,
      }
      return produto
        ? productService.update(produto.PROIDPRODUTO, { ...payload, ativo })
        : productService.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-low-stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stock-by-category'] })
      toast.success(produto ? 'Produto atualizado!' : 'Produto criado!')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const titulo =
    state.mode === 'new'  ? 'Novo Produto' :
    state.mode === 'edit' ? 'Editar Produto' : 'Visualizar Produto'

  const categoriasAtivas = categorias.filter(c => c.CATATIVO)
  const unidadesAtivas   = unidades.filter(u => u.UNIATIVO)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{titulo}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); if (!readOnly) salvar.mutate() }}
          className="space-y-4"
        >
          <div>
            <label className="label">Nome</label>
            <input className="input-field" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Mouse Gamer" required autoFocus={!readOnly} readOnly={readOnly} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU</label>
              <input className="input-field" value={sku} onChange={e => setSku(e.target.value)} placeholder="Ex: MOU-001" readOnly={readOnly} />
            </div>
            <SelectModal label="Unidade" placeholder="Selecione a unidade..." emptyLabel="Sem unidade" value={unidadeId} options={unidadesAtivas.map(u => ({ id: u.UNIIDUNIDADE, label: u.UNISIGLA, sub: u.UNIDESCRICAO }))} onChange={setUnidadeId} readOnly={readOnly} />
          </div>

          <SelectModal label="Categoria" placeholder="Selecione a categoria..." emptyLabel="Sem categoria" value={categoriaId} options={categoriasAtivas.map(c => ({ id: c.CATIDCATEGORIA, label: c.CATNOME }))} onChange={setCategoriaId} readOnly={readOnly} />

          <div>
            <label className="label">Descricao</label>
            <textarea className="input-field min-h-[60px] resize-y" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descricao do produto..." readOnly={readOnly} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Preco Custo</label>
              <input className="input-field" type="number" step="0.01" min="0" value={precoCusto} onChange={e => setPrecoCusto(e.target.value)} placeholder="0,00" readOnly={readOnly} />
            </div>
            <div>
              <label className="label">Preco Venda</label>
              <input className="input-field" type="number" step="0.01" min="0" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} placeholder="0,00" readOnly={readOnly} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estoque Atual</label>
              <input className="input-field" type="number" step="0.001" min="0" value={estoqueAtual} onChange={e => setEstoqueAtual(e.target.value)} placeholder="0" readOnly={readOnly || !!produto} title={produto ? 'Estoque e alterado via movimentacoes' : undefined} />
            </div>
            <div>
              <label className="label">Estoque Minimo</label>
              <input className="input-field" type="number" step="0.001" min="0" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} placeholder="0" readOnly={readOnly} />
            </div>
          </div>

          {produto && (
            <div className="flex items-center gap-3">
              <div
                role="switch"
                aria-checked={ativo}
                tabIndex={readOnly ? -1 : 0}
                onClick={() => !readOnly && setAtivo(a => !a)}
                onKeyDown={e => { if (!readOnly && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setAtivo(a => !a) } }}
                className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${ativo ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'} ${readOnly ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-gray-700 dark:text-slate-300">{ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{readOnly ? 'Fechar' : 'Cancelar'}</button>
            {!readOnly && (
              <button type="submit" disabled={salvar.isPending} className="btn-primary">{salvar.isPending ? 'Salvando...' : 'Salvar'}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Pagina principal ─────────────────────────────────────────
export default function ProductsPage() {
  const qc = useQueryClient()
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [search, setSearch]             = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [pagina, setPagina]             = useState(1)
  const [historyProduto, setHistoryProduto] = useState<Produto | null>(null)

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn:  () => productService.getAll(),
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn:  categoryService.getAll,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn:  unitService.getAll,
  })

  const { data: recentMovements = [] } = useQuery({
    queryKey: ['recent-movements'],
    queryFn:  dashboardService.getRecentMovements,
  })

  const excluir = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-low-stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stock-by-category'] })
      toast.success('Produto excluido!')
      setConfirmDelete(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Filtro
  const filtrados = useMemo(() =>
    produtos.filter(p =>
      p.PRONOME.toLowerCase().includes(search.toLowerCase()) ||
      (p.PROSKU && p.PROSKU.toLowerCase().includes(search.toLowerCase()))
    ),
    [produtos, search],
  )

  // Reset pagina quando filtra
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const produtosPagina = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  // Resumo
  const resumo = useMemo(() => {
    const ativos = produtos.filter(p => p.PROATIVO)
    const totalItens = ativos.reduce((acc, p) => acc + p.PROESTOQUEATUAL, 0)
    const valorEstoque = ativos.reduce((acc, p) => acc + (p.PROPRECOVENDA ?? 0) * p.PROESTOQUEATUAL, 0)
    const baixoEstoque = ativos.filter(p => p.PROESTOQUEATUAL <= p.PROESTOQUEMINIMO).length
    return { totalItens, valorEstoque, baixoEstoque }
  }, [produtos])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Produtos</h1>
        <button className="btn-primary w-full sm:w-auto justify-center whitespace-nowrap" onClick={() => setModal({ mode: 'new' })}>
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <CollapsibleFilter hasActiveFilters={!!search}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field w-full sm:max-w-xs pl-10"
            placeholder="Pesquisar produtos..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPagina(1) }}
          />
        </div>
      </CollapsibleFilter>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">Total de Itens:</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{fmtQty(resumo.totalItens)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">Valor do Estoque:</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{fmtMoeda(resumo.valorEstoque)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Itens com Baixo Estoque:</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{resumo.baixoEstoque}</p>
            </div>
            {resumo.baixoEstoque > 0 && (
              <AlertTriangle className="w-5 h-5 text-red-500 mt-1" />
            )}
          </div>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">Movimentacoes Recentes</p>
          <div className="mt-2 space-y-1.5">
            {recentMovements.slice(0, 2).map(m => (
              <div key={m.MOVIDMOVIMENTACAO} className="text-xs text-gray-600 dark:text-slate-300">
                <span className="text-gray-400 dark:text-slate-500">{timeAgo(m.MOVDATACADASTRO)}</span>
                {' - '}
                <span>{m.produto_sku || m.produto_nome}</span>
                {' '}
                <span className={m.tipo_operacao === '+' ? 'text-green-600' : 'text-red-500'}>
                  {m.tipo_operacao === '+' ? 'Adicionado' : 'Vendido'}
                </span>
              </div>
            ))}
            {recentMovements.length === 0 && (
              <p className="text-xs text-gray-400">Nenhuma movimentacao</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {search ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-slate-700">
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 hidden md:table-cell">SKU</th>
                    <th className="px-4 py-3">Nome do Produto</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Categoria</th>
                    <th className="px-4 py-3 text-right">Qtd em Estoque</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Preco Unitario</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Valor Total</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Status</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {produtosPagina.map(prod => {
                    const status = getStockStatus(prod)
                    const valorTotal = (prod.PROPRECOVENDA ?? 0) * prod.PROESTOQUEATUAL
                    return (
                      <tr key={prod.PROIDPRODUTO} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400 font-mono hidden md:table-cell">{prod.PROSKU || '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{prod.PRONOME}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{prod.categoria?.nome || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmtQty(prod.PROESTOQUEATUAL)}</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white hidden sm:table-cell">{fmtMoeda(prod.PROPRECOVENDA)}</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white hidden md:table-cell">{fmtMoeda(valorTotal)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`badge ${status.color}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button title="Visualizar" onClick={() => setModal({ mode: 'view', produto: prod })} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button title="Historico" onClick={() => setHistoryProduto(prod)} className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                              <History className="w-4 h-4" />
                            </button>
                            <button title="Editar" onClick={() => setModal({ mode: 'edit', produto: prod })} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {confirmDelete === prod.PROIDPRODUTO ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => excluir.mutate(prod.PROIDPRODUTO)} disabled={excluir.isPending} className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Confirmar</button>
                                <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-xs btn-secondary">Cancelar</button>
                              </div>
                            ) : (
                              <button title="Excluir" onClick={() => setConfirmDelete(prod.PROIDPRODUTO)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPagina(1)}
                    disabled={paginaAtual === 1}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Primeira pagina"
                  >
                    <ChevronLeft className="w-4 h-4" /><ChevronLeft className="w-4 h-4 -ml-3" />
                  </button>
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Pagina anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Números de página */}
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 1)
                    .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1]) > 1) acc.push('dots')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, i) =>
                      item === 'dots' ? (
                        <span key={`dots-${i}`} className="px-1 text-gray-400">...</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setPagina(item)}
                          className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${
                            paginaAtual === item
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                        >{item}</button>
                      )
                    )}

                  <button
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Proxima pagina"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPagina(totalPaginas)}
                    disabled={paginaAtual === totalPaginas}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Ultima pagina"
                  >
                    <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-3" />
                  </button>
                </div>

                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {paginaAtual} of {totalPaginas}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ProdutoModal
          state={modal}
          categorias={categorias}
          unidades={unidades}
          onClose={() => setModal(null)}
        />
      )}

      {/* Historico de movimentacoes */}
      {historyProduto && (
        <MovementHistory
          produtoId={historyProduto.PROIDPRODUTO}
          produtoNome={historyProduto.PRONOME}
          produtoSku={historyProduto.PROSKU}
          onClose={() => setHistoryProduto(null)}
        />
      )}
    </div>
  )
}
