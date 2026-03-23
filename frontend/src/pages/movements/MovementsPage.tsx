import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, X, RotateCcw, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import CollapsibleFilter from '../../components/CollapsibleFilter'
import { movementService } from '../../services/movement_service'
import { productService } from '../../services/product_service'
import { movementTypeService } from '../../services/movementType_service'
import SelectModal from '../../components/SelectModal'
import type { Movimentacao, TipoMovimentacao, Produto, FiltrosMovimentacao } from '../../types'

type ModalState =
  | { mode: 'new' }
  | { mode: 'view'; movimentacao: Movimentacao }
  | { mode: 'cancel'; movimentacao: Movimentacao }

// ── Modal Nova Movimentação ──────────────────────────────────
function NovaMovimentacaoModal({
  produtos,
  tipos,
  onClose,
}: {
  produtos: Produto[]
  tipos: TipoMovimentacao[]
  onClose: () => void
}) {
  const qc = useQueryClient()

  const [produtoId, setProdutoId]         = useState('')
  const [tipoId, setTipoId]               = useState('')
  const [quantidade, setQuantidade]       = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [observacao, setObservacao]       = useState('')

  const tipoSelecionado = tipos.find(t => t.TIMIDTIPO === tipoId)
  const produtosAtivos  = produtos.filter(p => p.PROATIVO)
  const tiposAtivos     = tipos.filter(t => t.TIMATIVO)

  const salvar = useMutation({
    mutationFn: () =>
      movementService.create({
        produto_id: produtoId,
        tipo_id: tipoId,
        quantidade: parseFloat(quantidade),
        justificativa: justificativa || null,
        observacao: observacao || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['produtos'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-low-stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard-recent-movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stock-by-category'] })
      qc.invalidateQueries({ queryKey: ['dashboard-movement-trends'] })
      qc.invalidateQueries({ queryKey: ['recent-movements'] })
      toast.success('Movimentação registrada!')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nova Movimentação</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); salvar.mutate() }}
          className="space-y-4"
        >
          {/* Produto */}
          <SelectModal
            label="Produto"
            placeholder="Selecione o produto..."
            emptyLabel="Nenhum"
            value={produtoId}
            options={produtosAtivos.map(p => ({
              id: p.PROIDPRODUTO,
              label: p.PRONOME,
              sub: p.PROSKU || undefined,
            }))}
            onChange={setProdutoId}
          />

          {/* Tipo de Movimentação */}
          <SelectModal
            label="Tipo de Movimentação"
            placeholder="Selecione o tipo..."
            emptyLabel="Nenhum"
            value={tipoId}
            options={tiposAtivos.map(t => ({
              id: t.TIMIDTIPO,
              label: t.TIMCODIGO,
              sub: `${t.TIMOPERACAO === '+' ? 'Entrada' : 'Saída'} — ${t.TIMDESCRICAO}`,
            }))}
            onChange={setTipoId}
          />

          {/* Info do tipo selecionado */}
          {tipoSelecionado && (
            <div className={`px-3 py-2 rounded-md text-xs ${
              tipoSelecionado.TIMOPERACAO === '+'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {tipoSelecionado.TIMOPERACAO === '+' ? '+ Entrada' : '- Saída'}: {tipoSelecionado.TIMDESCRICAO}
              {tipoSelecionado.TIMEXIGEJUSTIFICATIVA && (
                <span className="ml-2 font-medium">(justificativa obrigatória)</span>
              )}
            </div>
          )}

          {/* Quantidade */}
          <div>
            <label className="label">Quantidade</label>
            <input
              className="input-field"
              type="number"
              step="0.001"
              min="0.001"
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          {/* Justificativa */}
          <div>
            <label className="label">
              Justificativa
              {tipoSelecionado?.TIMEXIGEJUSTIFICATIVA && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <textarea
              className="input-field min-h-[60px] resize-y"
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Motivo da movimentação..."
              required={tipoSelecionado?.TIMEXIGEJUSTIFICATIVA}
              rows={2}
            />
          </div>

          {/* Observação */}
          <div>
            <label className="label">Observação</label>
            <textarea
              className="input-field min-h-[40px] resize-y"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observação opcional..."
              rows={1}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              type="submit"
              disabled={salvar.isPending || !produtoId || !tipoId || !quantidade}
              className="btn-primary"
            >
              {salvar.isPending ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Visualizar ─────────────────────────────────────────
function VisualizarModal({ mov, onClose }: { mov: Movimentacao; onClose: () => void }) {
  const info = [
    { label: 'Produto',       value: mov.produto?.nome ?? '—' },
    { label: 'SKU',           value: mov.produto?.sku ?? '—' },
    { label: 'Tipo',          value: `${mov.tipo_movimentacao?.codigo} — ${mov.tipo_movimentacao?.descricao}` },
    { label: 'Operação',      value: mov.tipo_movimentacao?.operacao === '+' ? '+ Entrada' : '- Saída' },
    { label: 'Quantidade',    value: String(mov.MOVQUANTIDADE) },
    { label: 'Justificativa', value: mov.MOVJUSTIFICATIVA || '—' },
    { label: 'Observação',    value: mov.MOVOBSERVACAO || '—' },
    { label: 'Data',          value: new Date(mov.MOVDATACADASTRO).toLocaleString('pt-BR') },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Detalhes da Movimentação</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {info.map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">{label}</span>
              <span className="text-gray-900 dark:text-white font-medium text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Cancelar ───────────────────────────────────────────
function CancelarModal({ mov, onClose }: { mov: Movimentacao; onClose: () => void }) {
  const qc = useQueryClient()
  const [justificativa, setJustificativa] = useState('')

  const cancelar = useMutation({
    mutationFn: () => movementService.cancel(mov.MOVIDMOVIMENTACAO, justificativa),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['produtos'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-low-stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard-recent-movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stock-by-category'] })
      qc.invalidateQueries({ queryKey: ['dashboard-movement-trends'] })
      qc.invalidateQueries({ queryKey: ['recent-movements'] })
      toast.success('Movimentação cancelada!')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-red-600">Cancelar Movimentação</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
          Será gerada uma movimentação inversa para o produto <strong>{mov.produto?.nome}</strong>.
          <br />Tipo original: <strong>{mov.tipo_movimentacao?.codigo}</strong> — Qtd: <strong>{mov.MOVQUANTIDADE}</strong>
        </div>

        <form onSubmit={e => { e.preventDefault(); cancelar.mutate() }} className="space-y-4">
          <div>
            <label className="label">Justificativa do cancelamento <span className="text-red-500">*</span></label>
            <textarea
              className="input-field min-h-[60px] resize-y"
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Motivo do cancelamento..."
              required
              autoFocus
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Voltar</button>
            <button
              type="submit"
              disabled={cancelar.isPending || !justificativa.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
            >
              {cancelar.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function MovementsPage() {
  const [modal, setModal]     = useState<ModalState | null>(null)
  const [filtros, setFiltros] = useState<FiltrosMovimentacao>({})

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ['movimentacoes', filtros],
    queryFn:  () => movementService.getAll(filtros),
  })

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn:  () => productService.getAll(),
  })

  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos-movimentacao'],
    queryFn:  movementTypeService.getAll,
  })

  const temFiltros = !!(filtros.produto_id || filtros.tipo_id || filtros.data_inicio || filtros.data_fim)

  function limparFiltros() {
    setFiltros({})
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Movimentações</h1>
        <button className="btn-primary w-full sm:w-auto justify-center" onClick={() => setModal({ mode: 'new' })}>
          <Plus className="w-4 h-4" />
          Nova Movimentação
        </button>
      </div>

      {/* Filtros */}
      <CollapsibleFilter hasActiveFilters={temFiltros}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SelectModal
            label="Produto"
            placeholder="Todos"
            emptyLabel="Todos"
            value={filtros.produto_id ?? ''}
            options={produtos.map(p => ({ id: p.PROIDPRODUTO, label: p.PRONOME, sub: p.PROSKU || undefined }))}
            onChange={v => setFiltros(f => ({ ...f, produto_id: v || undefined }))}
          />
          <SelectModal
            label="Tipo"
            placeholder="Todos"
            emptyLabel="Todos"
            value={filtros.tipo_id ?? ''}
            options={tipos.map(t => ({ id: t.TIMIDTIPO, label: t.TIMCODIGO, sub: t.TIMDESCRICAO }))}
            onChange={v => setFiltros(f => ({ ...f, tipo_id: v || undefined }))}
          />
          <div>
            <label className="label">Data Inicio</label>
            <input
              type="date"
              className="input-field"
              value={filtros.data_inicio ?? ''}
              onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value || undefined }))}
            />
          </div>
          <div>
            <label className="label">Data Fim</label>
            <input
              type="date"
              className="input-field"
              value={filtros.data_fim ?? ''}
              onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value || undefined }))}
            />
          </div>
        </div>
        {temFiltros && (
          <button onClick={limparFiltros} className="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </CollapsibleFilter>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : movimentacoes.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {temFiltros ? 'Nenhuma movimentação encontrada com esses filtros.' : 'Nenhuma movimentação registrada.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-slate-700">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 hidden sm:table-cell">Data</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Tipo</th>
                  <th className="px-4 py-3">Operação</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                {movimentacoes.map(mov => {
                  const isEntrada = mov.tipo_movimentacao?.operacao === '+'
                  const isCancelamento = mov.MOVTIPOREFERENCIA === 'cancelamento'

                  return (
                    <tr key={mov.MOVIDMOVIMENTACAO} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell">
                        {new Date(mov.MOVDATACADASTRO).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">{mov.produto?.nome}</div>
                        {mov.produto?.sku && (
                          <div className="text-xs text-gray-400">{mov.produto.sku}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-gray-700 dark:text-slate-300">
                          {mov.tipo_movimentacao?.codigo}
                        </span>
                        {isCancelamento && (
                          <span className="ml-1.5 text-xs text-orange-500">(cancelamento)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${isEntrada
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {isEntrada ? '+ Entrada' : '- Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {mov.MOVQUANTIDADE}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Visualizar"
                            onClick={() => setModal({ mode: 'view', movimentacao: mov })}
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isCancelamento && (
                            <button
                              title="Cancelar movimentação"
                              onClick={() => setModal({ mode: 'cancel', movimentacao: mov })}
                              className="p-1.5 rounded-md text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
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
        )}
      </div>

      {/* Modais */}
      {modal?.mode === 'new' && (
        <NovaMovimentacaoModal
          produtos={produtos}
          tipos={tipos}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === 'view' && (
        <VisualizarModal mov={modal.movimentacao} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'cancel' && (
        <CancelarModal mov={modal.movimentacao} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
