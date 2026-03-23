import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export interface SelectModalOption {
  id: string
  label: string
  sub?: string
}

interface SelectModalProps {
  label: string
  placeholder?: string
  emptyLabel?: string
  value: string
  options: SelectModalOption[]
  onChange: (id: string) => void
  readOnly?: boolean
}

export default function SelectModal({
  label,
  placeholder = 'Selecione...',
  emptyLabel = 'Nenhum',
  value,
  options,
  onChange,
  readOnly = false,
}: SelectModalProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.id === value)

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.sub && o.sub.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    if (open) {
      setSearch('')
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  // fechar ao clicar fora
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // fechar com Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  if (readOnly) {
    return (
      <div>
        <label className="label">{label}</label>
        <input
          className="input-field"
          value={selected ? (selected.sub ? `${selected.label} — ${selected.sub}` : selected.label) : emptyLabel}
          readOnly
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="label">{label}</label>

      {/* Botão trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input-field w-full flex items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${selected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
          {selected
            ? (selected.sub ? `${selected.label} — ${selected.sub}` : selected.label)
            : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-[60] mt-1 w-full card shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden"
        >
          {/* Busca */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-slate-700">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-48 overflow-y-auto scrollbar-thin">
            {/* Opção "nenhum" */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                !value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium' : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              {emptyLabel}
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">Nenhum resultado</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                    value === opt.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.sub && (
                    <span className="ml-1.5 text-gray-400 dark:text-slate-500 text-xs">{opt.sub}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
