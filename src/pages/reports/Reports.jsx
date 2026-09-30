import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Filter, Printer, ArrowDownToLine, ArrowUpFromLine, CreditCard, Calendar, Folder, Users, Search } from 'lucide-react'
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

    if (reportType === 'expense') {
      reportService.exportExpenseExcelCustom(reportData.data, `laporan-${reportType}`)
      return
    }

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
      title: `Laporan ${reportType === 'income' ? 'Pemasukan' : reportType === 'expense' ? 'Pengeluaran' : 'Hutang'}`,
      period,
      transactions: reportData.data,
      income,
      expense,
      balance: income - expense,
      totalDebt: reportData.totalDebt || 0,
      totalRemaining: reportData.totalRemaining || 0,
      totalPaid: reportData.totalPaid || 0,
      reportType,
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
        <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">Laporan</h1>
        <p className="text-xs text-slate-500">Generate dan export laporan keuangan</p>
      </div>

      {/* Report config */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-white/5 p-4 sm:p-6 space-y-6 shadow-sm">
        {/* Type selector */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Filter size={16} className="text-blue-500" />
            Pilih Jenis Laporan
          </h2>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { key: 'income', label: 'Pemasukan', icon: ArrowDownToLine, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
              { key: 'expense', label: 'Pengeluaran', icon: ArrowUpFromLine, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' },
              { key: 'debt', label: 'Hutang', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]' },
            ].map(({ key, label, icon: Icon, color, bg, border, glow }) => {
              const isActive = reportType === key;
              return (
                <button
                  key={key}
                  onClick={() => { setReportType(key); setReportData(null); setFilters({ startDate: '', endDate: '', category_id: '', created_by: '', status: '' }) }}
                  className={`flex flex-col items-center justify-center py-4 px-2 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group outline-none
                    ${isActive ? `${border} ${bg} ${glow}` : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'}
                  `}
                >
                  <Icon size={24} className={`${isActive ? color : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'} mb-2.5 transition-colors`} />
                  <span className={`text-xs sm:text-sm font-bold ${isActive ? color : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
                  {isActive && <div className={`absolute top-0 left-0 w-full h-1 ${bg.replace('/10', '')} opacity-50`}></div>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="h-px w-full bg-slate-200 dark:bg-white/10" />

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Dari Tanggal</label>
            <input type="date" className="input-field"
              value={filters.startDate}
              onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Sampai Tanggal</label>
            <input type="date" className="input-field"
              value={filters.endDate}
              onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          {reportType === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Kategori</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Folder size={14} /></span>
                <select className="input-field !pl-10"
                  value={filters.category_id}
                  onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Semua Kategori</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {reportType === 'debt' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Status Hutang</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Filter size={14} /></span>
                <select className="input-field !pl-10"
                  value={filters.status || ''}
                  onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
                  <option value="">Semua Status</option>
                  <option value="BELUM LUNAS">Belum Lunas</option>
                  <option value="SEBAGIAN">Sebagian</option>
                  <option value="LUNAS">Lunas</option>
                </select>
              </div>
            </div>
          )}
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Petugas</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Users size={14} /></span>
                <select className="input-field !pl-10"
                  value={filters.created_by}
                  onChange={e => setFilters(p => ({ ...p, created_by: e.target.value }))}>
                  <option value="">Semua Petugas</option>
                  {users?.map(u => <option key={u.id} value={u.user_id}>{u.full_name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          className="w-full mt-4 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2
            bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/25 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none"
          disabled={loading}
        >
          {loading ? <Spinner size={16} color="white" /> : <Search size={16} />}
          {loading ? 'Memproses Laporan...' : 'Tampilkan Laporan'}
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
          <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Laporan {reportType === 'income' ? 'Pemasukan' : reportType === 'expense' ? 'Pengeluaran' : 'Hutang'}
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
            {reportType === 'debt' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={48} className="text-amber-500" /></div>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">Total Hutang</p>
                  <p className="text-2xl font-bold currency text-slate-800 dark:text-slate-100">{formatCurrency(reportData.totalDebt)}</p>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={48} className="text-emerald-500" /></div>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Total Terbayar</p>
                  <p className="text-2xl font-bold currency text-slate-800 dark:text-slate-100">{formatCurrency(reportData.totalPaid)}</p>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={48} className="text-red-500" /></div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Sisa Hutang</p>
                  <p className="text-2xl font-bold currency text-slate-800 dark:text-slate-100">{formatCurrency(reportData.totalRemaining)}</p>
                </div>
              </div>
            ) : (
              <div className={`p-6 rounded-2xl relative overflow-hidden border ${reportType === 'income' ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20' : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20'}`}>
                <div className={`absolute top-0 right-0 p-6 opacity-10 ${reportType === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {reportType === 'income' ? <ArrowDownToLine size={64} /> : <ArrowUpFromLine size={64} />}
                </div>
                <p className={`text-sm font-semibold mb-1 ${reportType === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  Total {reportType === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </p>
                <p className="text-3xl md:text-4xl font-black tracking-tight currency text-slate-900 dark:text-white mb-2">
                  {formatCurrency(reportData.total)}
                </p>
                <p className="text-xs font-medium text-slate-500 inline-flex items-center gap-1.5 bg-white/50 dark:bg-black/20 px-2.5 py-1 rounded-full">
                  <FileText size={12} /> {reportData.data?.length || 0} transaksi ditemukan
                </p>
              </div>
            )}

            {/* Category breakdown for expense */}
            {reportType === 'expense' && reportData.byCategory && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">Rincian per Kategori</h4>
                <div className="space-y-2">
                  {Object.entries(reportData.byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, amount]) => {
                      const pct = Math.round((amount / reportData.total) * 100)
                      return (
                        <div key={name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-700 dark:text-slate-300">{name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600 dark:text-slate-400">{pct}%</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 currency">{formatCurrency(amount)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
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
            <div className="glass rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  Detail Transaksi
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/5">
                      <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggal</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {reportType === 'income' ? 'Sumber' : reportType === 'expense' ? 'Kategori' : 'Pihak Terkait'}
                      </th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden md:table-cell">Keterangan</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                        {reportType === 'debt' ? 'Status' : 'Petugas'}
                      </th>
                      <th className="text-right px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {reportType === 'debt' ? 'Sisa Hutang' : 'Nominal'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {reportData.data.map((tx, idx) => (
                      <tr key={tx.id} className={`table-row-hover ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/30 dark:bg-slate-800/20'}`}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(reportType === 'debt' ? tx.due_date : tx.transaction_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200">
                          {reportType === 'debt' ? tx.party_name : (tx.source || tx.categories?.name || '-')}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">{tx.description || '-'}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                          {reportType === 'debt' ? (
                            <span className={`px-2 py-1 rounded-full text-[10px] ${
                              tx.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              tx.status === 'SEBAGIAN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {tx.status}
                            </span>
                          ) : (tx.creator?.full_name || '-')}
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold text-right currency ${reportType === 'income' ? 'text-emerald-600 dark:text-emerald-400' : reportType === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {formatCurrency(reportType === 'debt' ? tx.remaining_amount : tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-t border-slate-300 dark:border-white/10">
                      <td colSpan={4} className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Total {reportType === 'debt' ? 'Sisa' : ''}</td>
                      <td className={`px-6 py-4 text-base font-black text-right currency ${reportType === 'income' ? 'text-emerald-600 dark:text-emerald-400' : reportType === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {formatCurrency(reportType === 'debt' ? reportData.totalRemaining : reportData.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl border border-slate-200 dark:border-white/5 py-12">
              <EmptyState icon={FileText} title="Tidak ada transaksi" description="Tidak ada data pada periode dan filter yang dipilih" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Reports
