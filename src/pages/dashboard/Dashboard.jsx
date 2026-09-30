import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, CreditCard, Wallet,
  ArrowUpRight, ArrowDownRight, Plus, RefreshCw,
  AlertTriangle, ChevronRight, Calendar,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { transactionService } from '@/services/transactions'
import { debtService } from '@/services/debts'
import { StatCard, EmptyState } from '@/components/ui'
import { formatCurrency, formatDate, formatRelative } from '@/utils/format'
import { useAuth } from '@/contexts/AuthContext'

const CHART_PERIODS = [
  { key: 'week', label: '7 Hari' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'year', label: 'Tahun Ini' },
]

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass border border-slate-300 dark:border-white/10 rounded-lg p-3 shadow-xl min-w-36">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs mb-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-slate-600 dark:text-slate-400">{p.name}</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const Dashboard = () => {
  const { profile, isAdmin } = useAuth()
  const [chartPeriod, setChartPeriod] = useState('month')

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: transactionService.getSummary,
    staleTime: 30000,
  })

  const { data: debtSummary, isLoading: debtLoading } = useQuery({
    queryKey: ['debt-summary'],
    queryFn: debtService.getDebtSummary,
    staleTime: 30000,
  })

  const { data: recentTx, isLoading: txLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => transactionService.getTransactions({ pageSize: 8, sortBy: 'created_at', sortOrder: 'desc' }),
    staleTime: 15000,
  })

  const { data: chartRaw } = useQuery({
    queryKey: ['chart-data', chartPeriod],
    queryFn: () => transactionService.getChartData(chartPeriod),
    staleTime: 60000,
  })

  const { data: overdueDebts } = useQuery({
    queryKey: ['debts-overdue'],
    queryFn: debtService.getOverdueDebts,
    staleTime: 60000,
    enabled: isAdmin,
  })

  // Process chart data
  const chartData = useProcessChartData(chartRaw, chartPeriod)
  const categoryData = useCategoryData(recentTx?.data)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam'
  const displayName = profile?.full_name || 'Admin'

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display gradient-text">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Calendar size={11} />
            {format(new Date(), "EEEE, dd MMMM yyyy", { locale: id })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/income/create" className="btn btn-success btn-sm hidden md:flex">
            <Plus size={13} /> Pemasukan
          </Link>
          <Link to="/expense/create" className="btn btn-danger btn-sm hidden md:flex">
            <Plus size={13} /> Pengeluaran
          </Link>
        </div>
      </div>

      {/* Overdue debt alert */}
      {isAdmin && overdueDebts?.length > 0 && (
        <Link to="/debt" className="block">
          <div className="glass rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 flex items-center gap-3 hover:border-amber-500/50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                {overdueDebts.length} Hutang Jatuh Tempo!
              </p>
              <p className="text-xs text-amber-400/70">
                {overdueDebts.map(d => d.party_name).slice(0, 3).join(', ')}
                {overdueDebts.length > 3 ? ` +${overdueDebts.length - 3} lainnya` : ''}
              </p>
            </div>
            <ChevronRight size={16} className="text-amber-400 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Saldo Saat Ini"
          value={formatCurrency(summary?.balance ?? 0)}
          icon={Wallet}
          color={summary?.balance >= 0 ? 'blue' : 'red'}
          loading={summaryLoading}
        />
        <StatCard
          title="Total Pemasukan"
          value={formatCurrency(summary?.income ?? 0)}
          icon={TrendingUp}
          color="green"
          loading={summaryLoading}
        />
        <StatCard
          title="Total Pengeluaran"
          value={formatCurrency(summary?.expense ?? 0)}
          icon={TrendingDown}
          color="red"
          loading={summaryLoading}
        />
        <StatCard
          title="Total Hutang"
          value={formatCurrency(debtSummary?.totalRemaining ?? 0)}
          subtitle={`${debtSummary?.unpaidCount ?? 0} belum lunas`}
          icon={CreditCard}
          color="amber"
          loading={debtLoading}
        />
      </div>

      {/* Quick actions — mobile */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Link to="/income/create" className="btn btn-success btn-sm w-full py-3 shadow-lg shadow-emerald-500/20">
          <Plus size={14} /> Catat Pemasukan
        </Link>
        <Link to="/expense/create" className="btn btn-danger btn-sm w-full py-3 shadow-lg shadow-red-500/20">
          <Plus size={14} /> Catat Pengeluaran
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 glass rounded-xl border border-slate-200 dark:border-white/5 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pemasukan vs Pengeluaran</h3>
              <p className="text-xs text-slate-500 mt-0.5">Perbandingan arus kas</p>
            </div>
            <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
              {CHART_PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setChartPeriod(p.key)}
                  className={`btn btn-xs whitespace-nowrap flex-shrink-0 ${chartPeriod === p.key ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => formatCurrency(v, true)}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#incomeGrad)"
                name="Pemasukan"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#expenseGrad)"
                name="Pengeluaran"
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-5 mt-3 justify-center">
            {[
              { color: '#10b981', label: 'Pemasukan' },
              { color: '#ef4444', label: 'Pengeluaran' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-3 h-0.5 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Pie chart */}
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Per Kategori</h3>
            <p className="text-xs text-slate-500 mt-0.5">Pengeluaran</p>
          </div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {categoryData.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-slate-500">{item.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-slate-600">Belum ada data pengeluaran</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Transaksi Terbaru</h3>
            <p className="text-xs text-slate-500 mt-0.5">8 aktivitas terakhir</p>
          </div>
          <div className="flex gap-2">
            <Link to="/income" className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors">
              Pemasukan →
            </Link>
            <span className="text-slate-700">|</span>
            <Link to="/expense" className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors">
              Pengeluaran →
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-white/5">
          {txLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-28" />
                  <div className="skeleton h-2.5 w-20" />
                </div>
                <div className="skeleton h-4 w-20" />
              </div>
            ))
          ) : recentTx?.data?.length > 0 ? (
            recentTx.data.map(tx => (
              <Link
                key={tx.id}
                to={tx.type === 'INCOME' ? `/income/${tx.id}/edit` : `/expense/${tx.id}/edit`}
                className="px-5 py-3.5 flex items-center gap-3 table-row-hover cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                  {tx.type === 'INCOME'
                    ? <ArrowUpRight size={15} className="text-emerald-400" />
                    : <ArrowDownRight size={15} className="text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {tx.source || tx.categories?.name || 'Transaksi'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tx.creator?.full_name || '-'} &bull; {formatRelative(tx.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold currency ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-slate-600">{formatDate(tx.transaction_date)}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="py-10">
              <EmptyState
                icon={RefreshCw}
                title="Belum ada transaksi"
                description="Mulai catat pemasukan atau pengeluaran pertama Anda"
              />
            </div>
          )}
        </div>
      </div>

      {/* Overdue debt detail (admin) */}
      {isAdmin && overdueDebts?.length > 0 && (
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hutang Jatuh Tempo</h3>
            <Link to="/debt" className="text-xs text-amber-400 hover:text-amber-300">Kelola →</Link>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {overdueDebts.slice(0, 5).map(debt => (
              <Link
                key={debt.id}
                to={`/debt/${debt.id}`}
                className="px-5 py-3.5 flex items-center gap-3 table-row-hover"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={15} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{debt.party_name}</p>
                  <p className="text-xs text-red-400">Jatuh tempo: {formatDate(debt.due_date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-amber-400 currency">{formatCurrency(debt.remaining_amount)}</p>
                  <p className="text-xs text-slate-500">sisa</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Process chart data hook
function useProcessChartData(rawData, period) {
  if (!rawData) return []

  const now = new Date()
  let labels = []

  if (period === 'week') {
    labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - 6 + i)
      return { date: d.toISOString().split('T')[0], label: format(d, 'EEE', { locale: id }) }
    })
  } else if (period === 'month') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    labels = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
      return {
        date: d.toISOString().split('T')[0],
        label: i % 5 === 0 ? String(i + 1) : '',
      }
    })
  } else {
    labels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), i, 1)
      return { date: `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`, label: format(d, 'MMM', { locale: id }) }
    })
  }

  return labels.map(({ date, label }) => {
    const income = rawData
      .filter(t => t.type === 'INCOME' && t.transaction_date?.startsWith(date))
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expense = rawData
      .filter(t => t.type === 'EXPENSE' && t.transaction_date?.startsWith(date))
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return { label, income, expense }
  })
}

function useCategoryData(transactions) {
  if (!transactions?.length) return []

  const expenses = transactions.filter(t => t.type === 'EXPENSE')
  const total = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
  if (!total) return []

  const grouped = {}
  expenses.forEach(t => {
    const cat = t.categories?.name || 'Lainnya'
    grouped[cat] = (grouped[cat] || 0) + Number(t.amount)
  })

  return Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / total) * 100),
    }))
}

export default Dashboard
