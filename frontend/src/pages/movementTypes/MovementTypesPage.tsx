import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import CollapsibleFilter from '../../components/CollapsibleFilter'
import { movementTypeService } from '../../services/movementType_service'
import type { TipoMovimentacao, Operacao } from '../../types'

type ModalState =
  | { mode: 'new' }
  | { mode: 'view' | 'edit'; tipo: TipoMovimentacao }

// ── Modal ────────────────────────────────────────────────────
function TipoModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const qc = useQueryClient()
  const tipo     = state.mode !== 'new' ? state.tipo : undefined
  const readOnly = state.mode === 'view'

  const [codigo, setCodigo]                       = useState(tipo?.TIMCODIGO ?? '')
  const [descricao, setDescricao]                 = useState(tipo?.TIMDESCRICAO ?? '')
  const [operacao, setOperacao]                   = useState<Operacao>(tipo?.TIMOPERACAO ?? '+')
  const [exigeJustificativa, setExigeJustificativa] = useState(tipo?.TIMEXIGEJUSTIFICATIVA ?? false)
  const [ativo, setAtivo]                         = useState(tipo?.TIMATIVO ?? true)

  const salvar = useMutation({
    mutationFn: () =>
      tipo
        ? movementTypeService.update(tipo.TIMIDTIPO, { codigo, descricao, operacao, exige_justificativa: exigeJustificativa, ativo })
        : movementTypeService.create({ codigo, descricao, operacao, exige_justificativa: exigeJustificativa }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tipos-movimentacao'] })
      toast.success(tipo ? 'Tipo atualizado!' : 'Tipo criado!')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const titulo =
    state.mode === 'new'  ? 'Novo Tipo de Movimentação' :
    state.mode === 'edit' ? 'Editar Tipo' : 'Visualizar Tipo'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-6">
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
          {/* Código */}
          <div>
            <label className="label">Código</label>
            <input
              className="input-field uppercase"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: COMPRA"
              required
              autoFocus={!readOnly}
              readOnly={readOnly}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="label">Descrição</label>
            <input
              className="input-field"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Entrada por compra"
              required
              readOnly={readOnly}
            />
          </div>

          {/* Operação */}
          <div>
            <label className="label">Operação</label>
            {readOnly ? (
              <input
                className="input-field"
                value={operacao === '+' ? '+ Entrada' : '- Saída'}
                readOnly
              />
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOperacao('+')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    operacao === '+'
                      ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                      : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  + Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setOperacao('-')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                    operacao === '-'
                      ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                      : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  - Saída
                </button>
              </div>
            )}
          </div>

          {/* Exige Justificativa */}
          <div className="flex items-center gap-3">
            <div
              role="switch"
              aria-checked={exigeJustificativa}
              tabIndex={readOnly ? -1 : 0}
              onClick={() => !readOnly && setExigeJustificativa(v => !v)}
              onKeyDown={e => { if (!readOnly && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setExigeJustificativa(v => !v) } }}
              className={`
                inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors
                ${exigeJustificativa ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}
                ${readOnly ? 'cursor-default opacity-70' : 'cursor-pointer'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform
                  ${exigeJustificativa ? 'translate-x-5' : 'translate-x-0.5'}
                `}
              />
            </div>
            <span className="text-sm text-gray-700 dark:text-slate-300">
              Exige justificativa
            </span>
          </div>

          {/* Ativo — visível no view e edit, não no new */}
          {tipo && (
            <div className="flex items-center gap-3">
              <div
                role="switch"
                aria-checked={ativo}
                tabIndex={readOnly ? -1 : 0}
                onClick={() => !readOnly && setAtivo(a => !a)}
                onKeyDown={e => { if (!readOnly && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setAtivo(a => !a) } }}
                className={`
                  inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors
                  ${ativo ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}
                  ${readOnly ? 'cursor-default opacity-70' : 'cursor-pointer'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform
                    ${ativo ? 'translate-x-5' : 'translate-x-0.5'}
                  `}
                />
              </div>
              <span className="text-sm text-gray-700 dark:text-slate-300">
                {ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              {readOnly ? 'Fechar' : 'Cancelar'}
            </button>
            {!readOnly && (
              <button type="submit" disabled={salvar.isPending} className="btn-primary">
                {salvar.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function MovementTypesPage() {
  const qc = useQueryClient()
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [search, setSearch]             = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['tipos-movimentacao'],
    queryFn:  movementTypeService.getAll,
  })

  const excluir = useMutation({
    mutationFn: movementTypeService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tipos-movimentacao'] })
      toast.success('Tipo excluído!')
      setConfirmDelete(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filtrados = tipos.filter(t =>
    t.TIMCODIGO.toLowerCase().includes(search.toLowerCase()) ||
    t.TIMDESCRICAO.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tipos de Movimentação</h1>
        <button className="btn-primary w-full sm:w-auto justify-center" onClick={() => setModal({ mode: 'new' })}>
          <Plus className="w-4 h-4" />
          Novo Tipo
        </button>
      </div>

      {/* Filtros */}
      <CollapsibleFilter hasActiveFilters={!!search}>
        <input
          className="input-field w-full sm:max-w-xs"
          placeholder="Buscar tipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </CollapsibleFilter>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {search ? 'Nenhum tipo encontrado.' : 'Nenhum tipo cadastrado.'}
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-slate-700">
              <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3 hidden sm:table-cell">Descrição</th>
                <th className="px-4 py-3">Operação</th>
                <th className="px-4 py-3 hidden sm:table-cell">Justificativa</th>
                <th className="px-4 py-3 hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {filtrados.map(tip => (
                <tr key={tip.TIMIDTIPO} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white font-mono">
                    {tip.TIMCODIGO}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-300 hidden sm:table-cell">
                    {tip.TIMDESCRICAO}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${tip.TIMOPERACAO === '+'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {tip.TIMOPERACAO === '+' ? '+ Entrada' : '- Saída'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell">
                    {tip.TIMEXIGEJUSTIFICATIVA ? 'Sim' : 'Não'}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`badge ${tip.TIMATIVO
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {tip.TIMATIVO ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Visualizar"
                        onClick={() => setModal({ mode: 'view', tipo: tip })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        title="Editar"
                        onClick={() => setModal({ mode: 'edit', tipo: tip })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {confirmDelete === tip.TIMIDTIPO ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => excluir.mutate(tip.TIMIDTIPO)}
                            disabled={excluir.isPending}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-xs btn-secondary"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          title="Excluir"
                          onClick={() => setConfirmDelete(tip.TIMIDTIPO)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {modal && <TipoModal state={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
