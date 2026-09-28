import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Filter, Printer } from 'lucide-react'
import { reportService } from '@/services/reports'
import { categoryService } from '@/services/categories'
import { userService } from '@/services/users'
import { formatCurrency, formatDate } from '@/utils/format'
import { EmptyState, Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

const Reports = () => {
  const { isAdmin } = useAuth()
  const [reportType, setReportType] = useState('income')
  const [filters, setFilters] = useState({ startDate: '', endDate: '', category_id: '', created_by: '' })
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
    enabled: isAdmin,
  })

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      let result
      const params = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        category_id: filters.category_id || undefined,
        created_by: filters.created_by || undefined,
      }

      if (reportType === 'income') {
        result = await reportService.getIncomeReport(params)
      } else if (reportType === 'expense') {
        result = await reportService.getExpenseReport(params)
      } else {
        result = await reportService.getDebtReport({ status: filters.status || undefined })
      }
      setReportData(result)
    } catch (err) {
      setError(err.message || 'Gagal mengambil data laporan')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!reportData?.data?.length) return
    const rows = reportData.data.map(t => ({
      Tanggal: t.transaction_date ? formatDate(t.transaction_date) : formatDate(t.due_date),
      Jenis: reportType === 'debt' ? 'Hutang' : (t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
      'Sumber/Kategori/Pihak': t.party_name || t.source || t.categories?.name || '-',
      Keterangan: t.description || '-',
      Nominal: reportType === 'debt' ? t.original_amount : t.amount,
      Petugas: t.creator?.full_name || '-',
    }))
    reportService.exportCSV(rows, `laporan-${reportType}`)
  }

  const handleExportExcel = () => {
    if (!reportData?.data?.length) return
    const rows = reportData.data.map(t => ({
      Tanggal: t.transaction_date ? formatDate(t.transaction_date) : formatDate(t.due_date),
      Jenis: reportType === 'debt' ? 'Hutang' : (t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
      'Sumber/Kategori/Pihak': t.party_name || t.source || t.categories?.name || '-',
      Keterangan: t.description || '-',
      Nominal: Number(reportType === 'debt' ? t.original_amount : t.amount),
      Petugas: t.creator?.full_name || '-',
    }))
    reportService.exportExcel(rows, `laporan-${reportType}`, reportType === 'income' ? 'Pemasukan' : (reportType === 'expense' ? 'Pengeluaran' : 'Hutang'))
  }

  const handleExportPDF = () => {
    if (!reportData) return
    const period = [
      filters.startDate ? formatDate(filters.startDate) : '',
      filters.endDate ? formatDate(filters.endDate) : '',
    ].filter(Boolean).join(' - ') || 'Semua Periode'

    const income = reportType === 'income' ? (reportData.total || 0) : 0
    const expense = reportType === 'expense' ? (reportData.total || 0) : 0

    reportService.exportPDF({
      title: `Laporan ${reportType === 'income' ? 'Pemasukan' : 'Pengeluaran'}`,
      period,
      transactions: reportData.data,
      income,
      expense,
      balance: income - expense,
    })
  }

  const handlePrint = () => window.print()

  const periodLabel = [
    filters.startDate ? formatDate(filters.startDate) : null,
    filters.endDate ? formatDate(filters.endDate) : null,
  ].filter(Boolean).join(' - ') || 'Semua Periode'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold font-display text-slate-100">Laporan</h1>
        <p className="text-xs text-slate-500">Generate dan export laporan keuangan</p>
      </div>

      {/* Report config */}
      <div className="glass rounded-xl border border-white/5 p-5 space-y-4">
        {/* Type selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Jenis Laporan</label>
          <div className="flex gap-2">
            {[
              { key: 'income', label: 'Pemasukan', color: 'emerald' },
              { key: 'expense', label: 'Pengeluaran', color: 'red' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => { setReportType(key); setReportData(null) }}
                className={`btn btn-sm ${reportType === key ? (color === 'emerald' ? 'btn-success' : 'btn-danger') : 'btn-ghost'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Dari Tanggal</label>
            <input type="date" className="input-field"
              value={filters.startDate}
              onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Sampai Tanggal</label>
            <input type="date" className="input-field"
              value={filters.endDate}
              onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          {reportType === 'expense' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Kategori</label>
              <select className="input-field"
                value={filters.category_id}
                onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">Semua Kategori</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {isAdmin && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Petugas</label>
              <select className="input-field"
                value={filters.created_by}
                onChange={e => setFilters(p => ({ ...p, created_by: e.target.value }))}>
                <option value="">Semua Petugas</option>
                {users?.map(u => <option key={u.id} value={u.user_id}>{u.full_name}</option>)}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? <Spinner size={14} /> : <Filter size={14} />}
          {loading ? 'Mengambil Data...' : 'Generate Laporan'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-xl border border-red-500/20 p-4 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Report result */}
      {reportData && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary */}
          <div className="glass rounded-xl border border-white/5 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Laporan {reportType === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{periodLabel}</p>
              </div>
              <div className="flex gap-2 flex-wrap no-print">
                <button onClick={handleExportCSV} className="btn btn-ghost btn-sm"><Download size={13} /> CSV</button>
                <button onClick={handleExportExcel} className="btn btn-ghost btn-sm"><Download size={13} /> Excel</button>
                <button onClick={handleExportPDF} className="btn btn-ghost btn-sm"><Download size={13} /> PDF</button>
                <button onClick={handlePrint} className="btn btn-ghost btn-sm"><Printer size={13} /> Print</button>
              </div>
            </div>

            {/* Total */}
            <div className={`p-4 rounded-xl ${reportType === 'income' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <p className="text-xs text-slate-400 mb-1">Total {reportType === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
              <p className={`text-2xl font-bold currency ${reportType === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(reportData.total)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{reportData.data?.length || 0} transaksi</p>
            </div>

            {/* Category breakdown for expense */}
            {reportType === 'expense' && reportData.byCategory && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-400 mb-3">Rincian per Kategori</h4>
                <div className="space-y-2">
                  {Object.entries(reportData.byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, amount]) => {
                      const pct = Math.round((amount / reportData.total) * 100)
                      return (
                        <div key={name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-300">{name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">{pct}%</span>
                              <span className="font-semibold text-slate-200 currency">{formatCurrency(amount)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-1">
                            <div className="h-1 rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            )}
          </div>

          {/* Transaction table */}
          {reportData.data?.length > 0 ? (
            <div className="glass rounded-xl border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-slate-200">Detail Transaksi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Tanggal</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">
                        {reportType === 'income' ? 'Sumber' : 'Kategori'}
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 hidden md:table-cell">Keterangan</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 hidden lg:table-cell">Petugas</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.data.map(tx => (
                      <tr key={tx.id} className="table-row-hover">
                        <td className="px-5 py-3.5 text-sm text-slate-300">{formatDate(tx.transaction_date)}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-200">{tx.source || tx.categories?.name || '-'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-400 hidden md:table-cell">{tx.description || '-'}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 hidden lg:table-cell">{tx.creator?.full_name || '-'}</td>
                        <td className={`px-5 py-3.5 text-sm font-semibold text-right currency ${reportType === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10">
                      <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-slate-300">Total</td>
                      <td className={`px-5 py-3 text-base font-bold text-right currency ${reportType === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(reportData.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl border border-white/5 py-12">
              <EmptyState icon={FileText} title="Tidak ada transaksi" description="Tidak ada data pada periode dan filter yang dipilih" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Reports
