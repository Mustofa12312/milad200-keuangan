import supabase from './supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/utils/format'

export const reportService = {
  async getIncomeReport({ startDate, endDate, source, created_by } = {}) {
    let query = supabase
      .from('transactions')
      .select(`*, creator:profiles!transactions_created_by_fkey(full_name)`)
      .eq('type', 'INCOME')
      .eq('is_deleted', false)

    if (startDate) query = query.gte('transaction_date', startDate)
    if (endDate) query = query.lte('transaction_date', endDate)
    if (source) query = query.ilike('source', `%${source}%`)
    if (created_by) query = query.eq('created_by', created_by)

    const { data, error } = await query.order('transaction_date', { ascending: false })
    if (error) throw error

    const total = data.reduce((sum, t) => sum + Number(t.amount), 0)
    return { data, total }
  },

  async getExpenseReport({ startDate, endDate, category_id, created_by } = {}) {
    let query = supabase
      .from('transactions')
      .select(`*, categories(name), creator:profiles!transactions_created_by_fkey(full_name)`)
      .eq('type', 'EXPENSE')
      .eq('is_deleted', false)

    if (startDate) query = query.gte('transaction_date', startDate)
    if (endDate) query = query.lte('transaction_date', endDate)
    if (category_id) query = query.eq('category_id', category_id)
    if (created_by) query = query.eq('created_by', created_by)

    const { data, error } = await query.order('transaction_date', { ascending: false })
    if (error) throw error

    // Group by category
    const byCategory = {}
    data.forEach(t => {
      const catName = t.categories?.name || 'Lainnya'
      if (!byCategory[catName]) byCategory[catName] = 0
      byCategory[catName] += Number(t.amount)
    })

    const total = data.reduce((sum, t) => sum + Number(t.amount), 0)
    return { data, total, byCategory }
  },

  async getDebtReport({ status } = {}) {
    let query = supabase
      .from('debts')
      .select(`*`)
      .order('due_date', { ascending: true })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    const totalDebt = data.reduce((sum, d) => sum + Number(d.original_amount), 0)
    const totalRemaining = data.reduce((sum, d) => sum + Number(d.remaining_amount), 0)
    const totalPaid = totalDebt - totalRemaining

    return { data, totalDebt, totalRemaining, totalPaid }
  },

  // Export to CSV
  exportCSV(data, filename = 'laporan') {
    const headers = Object.keys(data[0] || {})
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },

  // Export to Excel
  exportExcel(data, filename = 'laporan', sheetName = 'Laporan') {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}.xlsx`)
  },

  // Export to PDF
  exportPDF({ title, period, transactions, income, expense, balance, totalDebt, totalRemaining, totalPaid, reportType = 'income' }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // Header
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(248, 250, 252)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), 105, 15, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('200 Tahun Panyeppen', 105, 23, { align: 'center' })
    doc.setFontSize(9)
    doc.text(`Periode: ${period}`, 105, 32, { align: 'center' })

    // Summary
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan', 14, 52)

    let summaryData = []
    if (reportType === 'debt') {
      summaryData = [
        ['Total Hutang', formatCurrency(totalDebt)],
        ['Total Terbayar', formatCurrency(totalPaid)],
        ['Sisa Hutang', formatCurrency(totalRemaining)],
      ]
    } else {
      summaryData = [
        ['Total Pemasukan', formatCurrency(income)],
        ['Total Pengeluaran', formatCurrency(expense)],
        ['Saldo', formatCurrency(balance)],
      ]
    }

    autoTable(doc, {
      startY: 56,
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    })

    // Transaction table
    if (transactions?.length) {
      doc.setFont('helvetica', 'bold')
      doc.text('Detail', 14, doc.lastAutoTable.finalY + 12)

      let head = []
      let body = []

      if (reportType === 'debt') {
        head = [['Jatuh Tempo', 'Pihak Terkait', 'Status', 'Sisa Hutang']]
        body = transactions.map(t => [
          t.due_date ? formatDate(t.due_date) : '-',
          t.party_name,
          t.status,
          formatCurrency(t.remaining_amount),
        ])
      } else {
        head = [['Tanggal', 'Jenis', 'Keterangan', 'Nominal']]
        body = transactions.map(t => [
          formatDate(t.transaction_date),
          t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
          t.source || t.categories?.name || t.description || '-',
          formatCurrency(t.amount),
        ])
      }

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head,
        body,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 64, 175] },
        columnStyles: { 3: { halign: 'right' } },
      })
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(`Halaman ${i} dari ${pageCount}`, 105, 290, { align: 'center' })
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 290)
    }

    doc.save('laporan-keuangan.pdf')
  },
}
