import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Calculator, Plus, Download, AlertTriangle, AlertCircle,
  CheckCircle2, Search, ArrowRight, ExternalLink
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { budgetService } from '@/services/budget'
import { useAuth } from '@/contexts/auth'
import { Spinner, EmptyState } from '@/components/ui'
import { formatCurrency } from '@/utils/format'
import ManageBudgetsModal from '@/components/budget/ManageBudgetsModal'
import toast from 'react-hot-toast'

const BudgetList = () => {
  const { isAdmin } = useAuth()

  const [showManageModal, setShowManageModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL | OVER | WARNING | SAFE | UNSET

  const { data: budgetData, isLoading } = useQuery({
    queryKey: ['budget-summary'],
    queryFn: () => budgetService.getBudgetSummary(),
    staleTime: 15000,
  })

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!budgetData?.items) return []
    return budgetData.items.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [budgetData, search, statusFilter])

  // Export to Excel
  const handleExportExcel = () => {
    if (!budgetData?.items?.length) {
      toast.error('Tidak ada data anggaran untuk diekspor')
      return
    }

    try {
      const rows = budgetData.items.map((item, idx) => ({
        'No': idx + 1,
        'Pos Acara / Kegiatan': item.name,
        'Pagu Anggaran (RAB)': item.budget,
        'Realisasi Belanja': item.spent,
        'Sisa Anggaran': item.remaining,
        'Persentase Serapan': `${item.percent.toFixed(1)}%`,
        'Jumlah Transaksi': item.count,
        'Status':
          item.status === 'OVER'
            ? 'OVER-BUDGET'
            : item.status === 'WARNING'
              ? 'MENDEKATI BATAS (>75%)'
              : item.status === 'SAFE'
                ? 'AMAN'
                : 'BELUM DIATUR',
      }))

      // Summary row
      rows.push({
        'No': '',
        'Pos Acara / Kegiatan': 'TOTAL KESELURUHAN',
        'Pagu Anggaran (RAB)': budgetData.totals.totalBudget,
        'Realisasi Belanja': budgetData.totals.totalSpent,
        'Sisa Anggaran': budgetData.totals.totalRemaining,
        'Persentase Serapan': `${budgetData.totals.totalPercent.toFixed(1)}%`,
        'Jumlah Transaksi': '',
        'Status': budgetData.totals.totalSpent > budgetData.totals.totalBudget ? 'OVER-BUDGET' : 'AMAN',
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)

      // Column widths
      ws['!cols'] = [
        { wch: 5 },
        { wch: 28 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 18 },
        { wch: 16 },
        { wch: 24 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'RAB vs Realisasi')
      const fileName = `RAB_Realisasi_Milad200_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('Laporan RAB berhasil diunduh!')
    } catch {
      toast.error('Gagal mengekspor laporan RAB')
    }
  }

  const totals = budgetData?.totals || {
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    totalPercent: 0,
    overBudgetCount: 0,
    warningCount: 0,
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calculator className="text-blue-500" size={22} />
            Rencana Anggaran Biaya (RAB)
          </h1>
          <p className="text-xs text-slate-500">
            Monitoring plafon anggaran vs realisasi belanja per kegiatan Milad 200 Tahun
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="btn btn-secondary btn-sm"
            title="Download Rekap Excel"
          >
            <Download size={14} /> Ekspor Excel
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowManageModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> Atur Pagu Anggaran
            </button>
          )}
        </div>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Pagu */}
        <div className="glass p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Total Pagu Anggaran (RAB)
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(totals.totalBudget)}
          </p>
          <span className="text-[10px] text-slate-400">Total alokasi seluruh pos</span>
        </div>

        {/* Total Realisasi */}
        <div className="glass p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Total Realisasi Belanja
          </span>
          <p className="text-base sm:text-lg font-bold text-red-500">
            {formatCurrency(totals.totalSpent)}
          </p>
          <span className="text-[10px] text-slate-400">Total uang yang telah dibelanjakan</span>
        </div>

        {/* Sisa Anggaran */}
        <div className="glass p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Sisa Anggaran Keseluruhan
          </span>
          <p className={`text-base sm:text-lg font-bold ${totals.totalRemaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {formatCurrency(totals.totalRemaining)}
          </p>
          <span className="text-[10px] text-slate-400">
            {totals.totalRemaining < 0 ? 'Defisit / Melebihi Pagu' : 'Saldo anggaran tersisa'}
          </span>
        </div>

        {/* Serapan */}
        <div className="glass p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Serapan Dana
            </span>
            <span className={`text-xs font-bold ${totals.totalPercent > 100 ? 'text-red-500' : totals.totalPercent >= 75 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
              {totals.totalPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${totals.totalPercent > 100
                ? 'bg-red-500'
                : totals.totalPercent >= 75
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
                }`}
              style={{ width: `${Math.min(totals.totalPercent, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {totals.overBudgetCount > 0
              ? `${totals.overBudgetCount} pos melebihi anggaran`
              : 'Semua pos dalam batas aman'}
          </span>
        </div>
      </div>

      {/* Over-budget alerts banner */}
      {totals.overBudgetCount > 0 && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-red-800 dark:text-red-300">
            <p className="font-bold">
              Peringatan: Terdapat {totals.overBudgetCount} Pos Acara yang Melebihi Plafon Anggaran!
            </p>
            <p className="mt-0.5 text-[11px] text-red-700 dark:text-red-400">
              Pengeluaran untuk pos ini telah melampaui batas yang dianggarkan. Silakan tinjau rincian pengeluaran atau perbarui pagu anggaran jika ada persetujuan dana tambahan.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass p-3 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field !py-1.5 !pl-9 !text-xs w-full"
            placeholder="Cari nama pos acara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-slate-400 font-medium">Status:</span>
          {[
            { key: 'ALL', label: 'Semua' },
            { key: 'OVER', label: `Over (${totals.overBudgetCount})` },
            { key: 'WARNING', label: `Waspada (${totals.warningCount})` },
            { key: 'SAFE', label: 'Aman' },
            { key: 'UNSET', label: 'Belum Diatur' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === key
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Spinner size={28} />
          <p className="text-xs text-slate-400">Memuat data anggaran & realisasi belanja...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 glass rounded-xl border border-slate-200 dark:border-white/5">
          <EmptyState
            icon={Calculator}
            title="Tidak ada pos acara ditemukan"
            description="Ubah kata kunci pencarian atau filter status untuk melihat data lain"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const hasBudget = item.budget > 0
            return (
              <div
                key={item.id}
                className="glass rounded-xl border border-slate-200 dark:border-white/5 p-4 space-y-3 hover:border-blue-500/30 transition-all group"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </h3>
                      {item.isCustom && (
                        <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          Kustom
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {item.count} transaksi pengeluaran tercatat
                    </p>
                  </div>

                  {/* Status badge */}
                  <div>
                    {item.status === 'OVER' ? (
                      <span className="badge badge-danger text-[10px] flex items-center gap-1 font-bold">
                        <AlertCircle size={10} /> Over-Budget
                      </span>
                    ) : item.status === 'WARNING' ? (
                      <span className="badge badge-warning text-[10px] flex items-center gap-1 font-bold">
                        <AlertTriangle size={10} /> Waspada (&gt;75%)
                      </span>
                    ) : item.status === 'SAFE' ? (
                      <span className="badge badge-success text-[10px] flex items-center gap-1 font-bold">
                        <CheckCircle2 size={10} /> Aman
                      </span>
                    ) : (
                      <span className="badge badge-gray text-[10px]">Belum Diatur</span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {hasBudget ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Serapan Anggaran</span>
                      <span className={`font-bold ${item.status === 'OVER' ? 'text-red-500' : item.status === 'WARNING' ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${item.status === 'OVER'
                          ? 'bg-red-500'
                          : item.status === 'WARNING'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                          }`}
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/30 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Plafon anggaran belum ditentukan</span>
                    {isAdmin && (
                      <button
                        onClick={() => setShowManageModal(true)}
                        className="text-blue-500 hover:underline font-semibold"
                      >
                        + Atur Pagu
                      </button>
                    )}
                  </div>
                )}

                {/* Financial figures */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">Pagu (RAB)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {hasBudget ? formatCurrency(item.budget) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Realisasi</span>
                    <span className="font-semibold text-red-500">
                      {formatCurrency(item.spent)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Sisa Anggaran</span>
                    <span className={`font-semibold ${!hasBudget ? 'text-slate-400' : item.remaining < 0 ? 'text-red-500' : 'text-emerald-500'
                      }`}>
                      {hasBudget ? formatCurrency(item.remaining) : '—'}
                    </span>
                  </div>
                </div>

                {/* Footer action links */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <Link
                    to={`/expense?source=${encodeURIComponent(item.name)}`}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"
                  >
                    <span>Lihat Transaksi Belanja</span>
                    <ArrowRight size={12} />
                  </Link>

                  <Link
                    to={`/expense/create`}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    <span>+ Catat Belanja</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Manage Budgets Modal */}
      <ManageBudgetsModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
      />
    </div>
  )
}

export default BudgetList
