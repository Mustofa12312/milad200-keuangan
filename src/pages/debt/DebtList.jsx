import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, CreditCard, ChevronRight, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { debtService } from '@/services/debts'
import { formatCurrency, formatDate, getStatusLabel } from '@/utils/format'
import { useAuth } from '@/contexts/AuthContext'
import { EmptyState, Pagination, StatCard } from '@/components/ui'

const statusIcon = { 'LUNAS': CheckCircle, 'SEBAGIAN': Clock, 'BELUM LUNAS': AlertCircle }
const statusColor = {
  'LUNAS': 'text-emerald-400 bg-emerald-400/10',
  'SEBAGIAN': 'text-amber-400 bg-amber-400/10',
  'BELUM LUNAS': 'text-red-400 bg-red-400/10',
}

const DebtList = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['debts', page, statusFilter],
    queryFn: () => debtService.getDebts({ page, pageSize: 20, status: statusFilter || undefined }),
  })

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['debt-summary'],
    queryFn: debtService.getDebtSummary,
    staleTime: 30000,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">Hutang</h1>
          <p className="text-xs text-slate-500">Kelola hutang organisasi</p>
        </div>
        <Link to="/debt/create" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <Plus size={14} /> Tambah Hutang
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Hutang" value={formatCurrency(summary?.totalDebt ?? 0)} icon={CreditCard} color="amber" loading={summaryLoading} />
        <StatCard title="Sisa Hutang" value={formatCurrency(summary?.totalRemaining ?? 0)} color="red" loading={summaryLoading} />
        <StatCard title="Sudah Dibayar" value={formatCurrency(summary?.totalPaid ?? 0)} color="green" loading={summaryLoading} />
        <StatCard
          title="Status"
          value={`${summary?.unpaidCount ?? 0} belum`}
          subtitle={`${summary?.partialCount ?? 0} sebagian • ${summary?.paidCount ?? 0} lunas`}
          color="blue"
          loading={summaryLoading}
        />
      </div>

      {/* Filter */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-4">
        <div className="flex gap-2">
          {['', 'BELUM LUNAS', 'SEBAGIAN', 'LUNAS'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            >
              {s || 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
        ) : data?.data?.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {data.data.map(debt => {
              const StatusIcon = statusIcon[debt.status] || AlertCircle
              const paidPct = Math.round(((debt.original_amount - debt.remaining_amount) / debt.original_amount) * 100)
              return (
                <div
                  key={debt.id}
                  className="p-4 flex items-start gap-4 table-row-hover cursor-pointer"
                  onClick={() => navigate(`/debt/${debt.id}`)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${statusColor[debt.status]}`}>
                    <StatusIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{debt.party_name}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 currency">{formatCurrency(debt.remaining_amount)}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>
                        {formatDate(debt.debt_date)}
                        {debt.due_date ? ` → ${formatDate(debt.due_date)}` : ''}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColor[debt.status]}`}>
                        {getStatusLabel(debt.status)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {paidPct}% terbayar • sisa {formatCurrency(debt.remaining_amount)} dari {formatCurrency(debt.original_amount)}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 flex-shrink-0 mt-2" />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12">
            <EmptyState icon={CreditCard} title="Belum ada hutang" description="Catat hutang organisasi di sini"
              action={<Link to="/debt/create" className="btn btn-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}><Plus size={14} /> Tambah</Link>} />
          </div>
        )}

        {data?.data?.length > 0 && (
          <div className="px-5 pb-4">
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}

export default DebtList
