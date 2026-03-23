import { useState, type ReactNode } from 'react'
import { Filter, ChevronDown } from 'lucide-react'

interface CollapsibleFilterProps {
  children: ReactNode
  hasActiveFilters?: boolean
}

export default function CollapsibleFilter({ children, hasActiveFilters }: CollapsibleFilterProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-slate-700/60">
          {children}
        </div>
      )}
    </div>
  )
}
