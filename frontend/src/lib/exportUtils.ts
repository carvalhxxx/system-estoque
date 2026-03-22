import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ── PDF ─────────────────────────────────────────────────────

interface PdfOptions {
  title: string
  subtitle?: string
  landscape?: boolean
  columns: { header: string; dataKey: string; align?: 'left' | 'center' | 'right' }[]
  rows: Record<string, string | number>[]
  summaryCards?: { label: string; value: string }[]
  totalsRow?: Record<string, string | number>
}

export function exportPdf(opts: PdfOptions) {
  const { title, subtitle, landscape = true, columns, rows, summaryCards, totalsRow } = opts
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 15

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, y)
  y += 6

  // Subtitle
  if (subtitle) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(subtitle, 14, y)
    doc.setTextColor(0)
    y += 6
  }

  // Summary cards
  if (summaryCards && summaryCards.length > 0) {
    const cardW = Math.min(45, (pageWidth - 28 - (summaryCards.length - 1) * 3) / summaryCards.length)
    let cx = 14
    for (const card of summaryCards) {
      doc.setDrawColor(200)
      doc.setFillColor(249, 249, 249)
      doc.roundedRect(cx, y, cardW, 16, 1.5, 1.5, 'FD')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30)
      doc.text(card.value, cx + cardW / 2, y + 7, { align: 'center' })
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text(card.label.toUpperCase(), cx + cardW / 2, y + 12.5, { align: 'center' })
      doc.setTextColor(0)
      cx += cardW + 3
    }
    y += 22
  }

  // Table
  const head = [columns.map(c => c.header)]
  const body = rows.map(row => columns.map(c => String(row[c.dataKey] ?? '—')))

  if (totalsRow) {
    body.push(columns.map(c => String(totalsRow[c.dataKey] ?? '')))
  }

  const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {}
  columns.forEach((c, i) => {
    if (c.align) columnStyles[i] = { halign: c.align }
  })

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [245, 245, 245], textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 7 },
    columnStyles,
    alternateRowStyles: { fillColor: [252, 252, 252] },
    didParseCell: (data) => {
      if (totalsRow && data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 240, 240]
      }
    },
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFontSize(7)
    doc.setTextColor(160)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} - Sistema de Estoque`, 14, pageH - 8)
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 14, pageH - 8, { align: 'right' })
  }

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`)
}

// ── Excel ───────────────────────────────────────────────────

interface ExcelOptions {
  filename: string
  sheetName?: string
  columns: { header: string; key: string; width?: number }[]
  rows: Record<string, string | number | null>[]
  totalsRow?: Record<string, string | number>
}

export function exportExcel(opts: ExcelOptions) {
  const { filename, sheetName = 'Dados', columns, rows, totalsRow } = opts

  const header = columns.map(c => c.header)
  const data = rows.map(row => columns.map(c => row[c.key] ?? ''))

  if (totalsRow) {
    data.push(columns.map(c => totalsRow[c.key] ?? ''))
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...data])

  // Column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? 15 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
