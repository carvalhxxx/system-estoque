import { useQuery } from '@tanstack/react-query'
import { X, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react'
import { movementService } from '../services/movement_service'
import type { Movimentacao } from '../types'

function fmtQty(v: number) {
  return v % 1 === 0 ? v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}

function fmtDateTime(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  return `${months}m`
}

interface Props {
  produtoId: string
  produtoNome: string
  produtoSku: string | null
  onClose: () => void
}

export default function MovementHistory({ produtoId, produtoNome, produtoSku, onClose }: Props) {
  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ['movimentacoes-produto', produtoId],
    queryFn: () => movementService.getByProduct(produtoId, 100),
  })

  const totalEntradas = movimentacoes.filter(m => m.tipo_movimentacao?.operacao === '+').reduce((acc, m) => acc + m.MOVQUANTIDADE, 0)
  const totalSaidas = movimentacoes.filter(m => m.tipo_movimentacao?.operacao === '-').reduce((acc, m) => acc + m.MOVQUANTIDADE, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Historico de Movimentacoes</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              {produtoNome} {produtoSku && <span className="font-mono text-xs">({produtoSku})</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        {movimentacoes.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-1.5 text-sm">
              <ArrowUpCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-500 dark:text-slate-400">Entradas:</span>
              <span className="font-semibold text-green-600">{fmtQty(totalEntradas)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <ArrowDownCircle className="w-4 h-4 text-red-500" />
              <span className="text-gray-500 dark:text-slate-400">Saidas:</span>
              <span className="font-semibold text-red-600">{fmtQty(totalSaidas)}</span>
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">
              {movimentacoes.length} registro{movimentacoes.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
          ) : movimentacoes.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Nenhuma movimentacao registrada para este produto.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {movimentacoes.map((m: Movimentacao) => {
                const isEntrada = m.tipo_movimentacao?.operacao === '+'
                return (
                  <div key={m.MOVIDMOVIMENTACAO} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isEntrada ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {isEntrada
                            ? <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            : <ArrowDownCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {m.tipo_movimentacao?.descricao || m.tipo_movimentacao?.codigo || '—'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                            <span>{fmtDateTime(m.MOVDATACADASTRO)}</span>
                            <span className="text-gray-300 dark:text-slate-600">·</span>
                            <span>{timeAgo(m.MOVDATACADASTRO)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`shrink-0 text-sm font-bold ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
                        {isEntrada ? '+' : '-'}{fmtQty(m.MOVQUANTIDADE)}
                      </span>
                    </div>
                    {(m.MOVJUSTIFICATIVA || m.MOVOBSERVACAO) && (
                      <div className="ml-11 mt-1.5 text-xs text-gray-500 dark:text-slate-400 space-y-0.5">
                        {m.MOVJUSTIFICATIVA && <p><span className="text-gray-400">Justificativa:</span> {m.MOVJUSTIFICATIVA}</p>}
                        {m.MOVOBSERVACAO && <p><span className="text-gray-400">Obs:</span> {m.MOVOBSERVACAO}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    </div>
  )
}
