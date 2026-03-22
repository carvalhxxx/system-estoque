import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, AlertTriangle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dashboardService, type ProdutoEstoqueBaixo } from '../services/dashboard_service'

function fmtQty(v: number) {
  return v % 1 === 0 ? v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}

export default function LowStockBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: items = [] } = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: dashboardService.getLowStock,
    refetchInterval: 60_000,
  })

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const count = items.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        title={count > 0 ? `${count} produto${count !== 1 ? 's' : ''} com estoque baixo` : 'Estoque OK'}
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Estoque Baixo</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-md">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
              Todos os produtos estao com estoque OK
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-slate-700/60">
              {items.map((item: ProdutoEstoqueBaixo) => {
                const esgotado = item.PROESTOQUEATUAL <= 0
                return (
                  <button
                    key={item.PROIDPRODUTO}
                    onClick={() => { setOpen(false); navigate('/produtos') }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.PRONOME}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {item.PROSKU || item.categoria_nome || '—'}
                        </p>
                      </div>
                      <span className={`shrink-0 badge text-xs ${esgotado ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {esgotado ? 'Esgotado' : 'Baixo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                      <span>Atual: <strong className={esgotado ? 'text-red-600' : 'text-yellow-600'}>{fmtQty(item.PROESTOQUEATUAL)}</strong></span>
                      <span>Minimo: <strong>{fmtQty(item.PROESTOQUEMINIMO)}</strong></span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {count > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => { setOpen(false); navigate('/produtos') }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Ver todos os produtos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
