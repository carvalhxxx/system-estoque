import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import CollapsibleFilter from '../../components/CollapsibleFilter'
import { unitService } from '../../services/unit_service'
import type { UnidadeMedida } from '../../types'

type ModalState =
  | { mode: 'new' }
  | { mode: 'view' | 'edit'; unidade: UnidadeMedida }

// ── Modal ────────────────────────────────────────────────────
function UnidadeModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const qc = useQueryClient()
  const unidade  = state.mode !== 'new' ? state.unidade : undefined
  const readOnly = state.mode === 'view'

  const [sigla, setSigla]         = useState(unidade?.UNISIGLA ?? '')
  const [descricao, setDescricao] = useState(unidade?.UNIDESCRICAO ?? '')
  const [ativo, setAtivo]         = useState(unidade?.UNIATIVO ?? true)

  const salvar = useMutation({
    mutationFn: () =>
      unidade
        ? unitService.update(unidade.UNIIDUNIDADE, { sigla, descricao, ativo })
        : unitService.create({ sigla, descricao }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unidades'] })
      toast.success(unidade ? 'Unidade atualizada!' : 'Unidade criada!')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const titulo =
    state.mode === 'new'  ? 'Nova Unidade' :
    state.mode === 'edit' ? 'Editar Unidade' : 'Visualizar Unidade'

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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Sigla</label>
              <input
                className="input-field"
                value={sigla}
                onChange={e => setSigla(e.target.value)}
                placeholder="Ex: kg"
                required
                autoFocus={!readOnly}
                readOnly={readOnly}
                maxLength={10}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Descrição</label>
              <input
                className="input-field"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Quilograma"
                required
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Ativo — visível no view e edit, não no new */}
          {unidade && (
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
export default function UnitsPage() {
  const qc = useQueryClient()
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [search, setSearch]             = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades'],
    queryFn:  unitService.getAll,
  })

  const excluir = useMutation({
    mutationFn: unitService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unidades'] })
      toast.success('Unidade excluída!')
      setConfirmDelete(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filtradas = unidades.filter(u =>
    u.UNISIGLA.toLowerCase().includes(search.toLowerCase()) ||
    u.UNIDESCRICAO.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Unidades de Medida</h1>
        <button className="btn-primary w-full sm:w-auto justify-center" onClick={() => setModal({ mode: 'new' })}>
          <Plus className="w-4 h-4" />
          Nova Unidade
        </button>
      </div>

      {/* Filtros */}
      <CollapsibleFilter hasActiveFilters={!!search}>
        <input
          className="input-field w-full sm:max-w-xs"
          placeholder="Buscar unidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </CollapsibleFilter>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {search ? 'Nenhuma unidade encontrada.' : 'Nenhuma unidade cadastrada.'}
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-slate-700">
              <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3">Sigla</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 hidden sm:table-cell">Cadastro</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {filtradas.map(uni => (
                <tr key={uni.UNIIDUNIDADE} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {uni.UNISIGLA}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                    {uni.UNIDESCRICAO}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`badge ${uni.UNIATIVO
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {uni.UNIATIVO ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell">
                    {new Date(uni.UNIDATACADASTRO).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Visualizar */}
                      <button
                        title="Visualizar"
                        onClick={() => setModal({ mode: 'view', unidade: uni })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* Editar */}
                      <button
                        title="Editar"
                        onClick={() => setModal({ mode: 'edit', unidade: uni })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Excluir */}
                      {confirmDelete === uni.UNIIDUNIDADE ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => excluir.mutate(uni.UNIIDUNIDADE)}
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
                          onClick={() => setConfirmDelete(uni.UNIIDUNIDADE)}
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

      {/* Modal */}
      {modal && <UnidadeModal state={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
