// ============================================================
// DATAS — nunca usar toISOString() para datas locais (UTC -3)
// ============================================================

/** Retorna a data atual no formato "YYYY-MM-DD" no fuso local */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Formata "YYYY-MM-DD" ou ISO string para "DD/MM/YYYY" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  // Adiciona T00:00:00 para evitar problema de timezone ao parsear só data
  const dateStr = value.includes('T') ? value : `${value}T00:00:00`
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

/** Formata datetime ISO para "DD/MM/YYYY HH:mm" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// ============================================================
// NÚMEROS
// ============================================================

/** Formata número para moeda BRL */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Formata quantidade com unidade */
export function formatQuantity(value: number, unit = 'un'): string {
  const formatted = value % 1 === 0
    ? value.toLocaleString('pt-BR')
    : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
  return `${formatted} ${unit}`
}

// ============================================================
// STRINGS
// ============================================================

/** Remove acentos e normaliza para busca */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Trunca texto com reticências */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max) + '…'
}
