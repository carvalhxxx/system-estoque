import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import XLSX from 'xlsx-js-style'

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
  const body = rows.map(row => columns.map(c => String(row[c.dataKey] ?? '\u2014')))

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
  title?: string
  subtitle?: string
  columns: { header: string; key: string; width?: number; currency?: boolean }[]
  rows: Record<string, string | number | null>[]
  totalsRow?: Record<string, string | number>
  summaryCards?: { label: string; value: string }[]
}

const COLORS = {
  primary: '1F4E79',
  primaryLight: 'D6E4F0',
  headerText: 'FFFFFF',
  titleText: '1F4E79',
  subtitleText: '666666',
  totalsBackground: 'E2EFDA',
  totalsBorder: 'A9D18E',
  summaryLabel: '8B8B8B',
  summaryValue: '1F4E79',
  border: 'B4C6E7',
  altRow: 'F2F7FB',
  white: 'FFFFFF',
}

const thinBorder = {
  top: { style: 'thin' as const, color: { rgb: COLORS.border } },
  bottom: { style: 'thin' as const, color: { rgb: COLORS.border } },
  left: { style: 'thin' as const, color: { rgb: COLORS.border } },
  right: { style: 'thin' as const, color: { rgb: COLORS.border } },
}

function cellRef(r: number, c: number): string {
  let col = ''
  let n = c
  while (n >= 0) {
    col = String.fromCharCode(65 + (n % 26)) + col
    n = Math.floor(n / 26) - 1
  }
  return `${col}${r + 1}`
}

export function exportExcel(opts: ExcelOptions) {
  const { filename, sheetName = 'Dados', title, subtitle, columns, rows, totalsRow, summaryCards } = opts

  const wb = XLSX.utils.book_new()
  const wsData: (string | number | null)[][] = []
  const merges: XLSX.Range[] = []
  const colCount = columns.length
  const lastCol = colCount - 1

  let currentRow = 0

  // ── Title row ──────────────────────────────────────────
  if (title) {
    wsData.push([title, ...Array(lastCol).fill(null)])
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: lastCol } })
    currentRow++

    // Subtitle / date row
    const sub = subtitle || `Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} - Sistema de Estoque`
    wsData.push([sub, ...Array(lastCol).fill(null)])
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: lastCol } })
    currentRow++

    // Empty spacer row
    wsData.push(Array(colCount).fill(null))
    currentRow++
  }

  // ── Summary cards row ──────────────────────────────────
  if (summaryCards && summaryCards.length > 0) {
    const labelRow: (string | null)[] = Array(colCount).fill(null)
    const valueRow: (string | null)[] = Array(colCount).fill(null)

    summaryCards.forEach((card, i) => {
      if (i < colCount) {
        labelRow[i] = card.label.toUpperCase()
        valueRow[i] = card.value
      }
    })

    wsData.push(labelRow)
    currentRow++
    wsData.push(valueRow)
    currentRow++

    // Spacer
    wsData.push(Array(colCount).fill(null))
    currentRow++
  }

  // ── Header row ─────────────────────────────────────────
  const headerRowIdx = currentRow
  wsData.push(columns.map(c => c.header))
  currentRow++

  // ── Data rows ──────────────────────────────────────────
  const dataStartRow = currentRow
  rows.forEach(row => {
    wsData.push(columns.map(c => row[c.key] ?? ''))
    currentRow++
  })

  // ── Totals row ─────────────────────────────────────────
  let totalsRowIdx = -1
  if (totalsRow) {
    totalsRowIdx = currentRow
    wsData.push(columns.map(c => totalsRow[c.key] ?? ''))
    currentRow++
  }

  // ── Create worksheet ───────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!merges'] = merges

  // Column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? 15 }))

  // Row heights
  const rowProps: { hpt?: number }[] = []
  for (let r = 0; r < currentRow; r++) {
    if (title && r === 0) rowProps.push({ hpt: 28 })
    else if (title && r === 1) rowProps.push({ hpt: 18 })
    else if (r === headerRowIdx) rowProps.push({ hpt: 22 })
    else rowProps.push({ hpt: 18 })
  }
  ws['!rows'] = rowProps

  // ── Apply styles ───────────────────────────────────────

  // Title style
  if (title) {
    const titleCell = ws[cellRef(0, 0)]
    if (titleCell) {
      titleCell.s = {
        font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: COLORS.titleText } },
        alignment: { vertical: 'center' },
      }
    }
    const subtitleCell = ws[cellRef(1, 0)]
    if (subtitleCell) {
      subtitleCell.s = {
        font: { name: 'Calibri', sz: 10, color: { rgb: COLORS.subtitleText } },
        alignment: { vertical: 'center' },
      }
    }
  }

  // Summary cards styles
  if (summaryCards && summaryCards.length > 0 && title) {
    const labelRowIdx = 3
    const valueRowIdx = 4
    summaryCards.forEach((_card, i) => {
      if (i >= colCount) return
      const labelCell = ws[cellRef(labelRowIdx, i)]
      if (labelCell) {
        labelCell.s = {
          font: { name: 'Calibri', sz: 8, color: { rgb: COLORS.summaryLabel } },
          alignment: { horizontal: 'center', vertical: 'center' },
        }
      }
      const valueCell = ws[cellRef(valueRowIdx, i)]
      if (valueCell) {
        valueCell.s = {
          font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: COLORS.summaryValue } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: COLORS.primaryLight } },
          border: thinBorder,
        }
      }
    })
  }

  // Header row style
  for (let c = 0; c < colCount; c++) {
    const cell = ws[cellRef(headerRowIdx, c)]
    if (cell) {
      cell.s = {
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.headerText } },
        fill: { fgColor: { rgb: COLORS.primary } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: COLORS.primary } },
          bottom: { style: 'medium', color: { rgb: COLORS.primary } },
          left: { style: 'thin', color: { rgb: COLORS.primary } },
          right: { style: 'thin', color: { rgb: COLORS.primary } },
        },
      }
    }
  }

  // Data rows style
  const currencyCols = new Set(columns.map((c, i) => c.currency ? i : -1).filter(i => i >= 0))
  for (let r = dataStartRow; r < dataStartRow + rows.length; r++) {
    const isAlt = (r - dataStartRow) % 2 === 1
    for (let c = 0; c < colCount; c++) {
      const cell = ws[cellRef(r, c)]
      if (cell) {
        cell.s = {
          font: { name: 'Calibri', sz: 10, color: { rgb: '333333' } },
          fill: { fgColor: { rgb: isAlt ? COLORS.altRow : COLORS.white } },
          alignment: {
            vertical: 'center',
            horizontal: currencyCols.has(c) || typeof cell.v === 'number' ? 'right' : 'left',
          },
          border: thinBorder,
        }
        if (currencyCols.has(c) && typeof cell.v === 'number') {
          cell.z = '#,##0.00'
        }
      }
    }
  }

  // Totals row style
  if (totalsRow && totalsRowIdx >= 0) {
    for (let c = 0; c < colCount; c++) {
      const cell = ws[cellRef(totalsRowIdx, c)]
      if (cell) {
        cell.s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1A3C1A' } },
          fill: { fgColor: { rgb: COLORS.totalsBackground } },
          alignment: {
            vertical: 'center',
            horizontal: currencyCols.has(c) || typeof cell.v === 'number' ? 'right' : 'left',
          },
          border: {
            top: { style: 'medium', color: { rgb: COLORS.totalsBorder } },
            bottom: { style: 'medium', color: { rgb: COLORS.totalsBorder } },
            left: { style: 'thin', color: { rgb: COLORS.totalsBorder } },
            right: { style: 'thin', color: { rgb: COLORS.totalsBorder } },
          },
        }
        if (currencyCols.has(c) && typeof cell.v === 'number') {
          cell.z = '#,##0.00'
        }
      }
    }
  }

  // Auto-filter on header row
  ws['!autofilter'] = { ref: `${cellRef(headerRowIdx, 0)}:${cellRef(headerRowIdx, lastCol)}` }

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
