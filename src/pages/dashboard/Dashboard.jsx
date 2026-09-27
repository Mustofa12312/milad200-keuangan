import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, CreditCard, Wallet,
  ArrowUpRight, ArrowDownRight, Plus, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval } from 'date-fns'
import { id } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { transactionService } from '@/services/transactions'
import { debtService } from '@/services/debts'
import { StatCard, Card, EmptyState } from '@/components/ui'
import { formatCurrency, formatDate, formatRelative, getStatusColor, getStatusLabel } from '@/utils/format'
import { useAuth } from '@/contexts/AuthContext'

const CHART_PERIODS = [
  { key: 'week', label: 'Minggu' },
  { key: 'month', label: 'Bulan' },
  { key: 'year', label: 'Tahun' },
]

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-xs font-medium text-slate-300 mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-semibold text-slate-200">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const Dashboard = () => {
  const { profile } = useAuth()
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
    queryFn: () => transactionService.getTransactions({ pageSize: 8, sortBy: 'created_at' }),
    staleTime: 15000,
  })

  const { data: chartRaw } = useQuery({
    queryKey: ['chart-data', chartPeriod],
    queryFn: () => transactionService.getChartData(chartPeriod),
    staleTime: 60000,
  })

  // Process chart data
  const chartData = useProcessChartData(chartRaw, chartPeriod)

  // Process category pie data from recent
  const categoryData = useCategoryData(recentTx?.data)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam'

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display gradient-text">{greeting}, {profile?.full_name?.split(' ')[0] || 'Admin'} 👋</h1>
          <p className="text-xs text-slate-500 mt-0.5">{format(new Date(), "EEEE, dd MMMM yyyy", { locale: id })}</p>
        </div>
        <Link to="/income/create" className="btn btn-primary btn-sm hidden sm:flex">
          <Plus size={14} /> Tambah
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Saldo Saat Ini"
          value={formatCurrency(summary?.balance ?? 0)}
          icon={Wallet}
          color="blue"
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 glass rounded-xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-200">Pemasukan vs Pengeluaran</h3>
            <div className="flex gap-1">
              {CHART_PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setChartPeriod(p.key)}
                  className={`btn btn-xs ${chartPeriod === p.key ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, true)} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" name="Pemasukan" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" name="Pengeluaran" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3 h-0.5 bg-emerald-500 rounded" />
              Pemasukan
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3 h-0.5 bg-red-500 rounded" />
              Pengeluaran
            </div>
          </div>
        </div>

        {/* Pie chart - category breakdown */}
        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Pengeluaran per Kategori</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center">
              <p className="text-xs text-slate-500">Belum ada data pengeluaran</p>
            </div>
          )}
          <div className="space-y-1.5 mt-2">
            {categoryData.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="text-slate-400 truncate max-w-24">{item.name}</span>
                </div>
                <span className="text-slate-300 font-medium">{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass rounded-xl border border-white/5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-slate-200">Transaksi Terbaru</h3>
          <Link to="/income" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Lihat semua →
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {txLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-2.5 w-24" />
                </div>
                <div className="skeleton h-4 w-20" />
              </div>
            ))
          ) : recentTx?.data?.length > 0 ? (
            recentTx.data.map(tx => (
              <div key={tx.id} className="px-5 py-3 flex items-center gap-3 table-row-hover">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                  {tx.type === 'INCOME'
                    ? <ArrowUpRight size={16} className="text-emerald-400" />
                    : <ArrowDownRight size={16} className="text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {tx.source || tx.categories?.name || 'Transaksi'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tx.creator?.full_name} • {formatRelative(tx.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold currency ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8">
              <EmptyState
                icon={RefreshCw}
                title="Belum ada transaksi"
                description="Mulai catat transaksi pemasukan atau pengeluaran"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Hooks
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
      return { date: d.toISOString().split('T')[0], label: String(i + 1) }
    })
  } else {
    labels = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), i, 1)
      return { date: `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`, label: format(d, 'MMM', { locale: id }) }
    })
  }

  return labels.map(({ date, label }) => {
    const income = rawData
      .filter(t => t.type === 'INCOME' && t.transaction_date.startsWith(date))
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expense = rawData
      .filter(t => t.type === 'EXPENSE' && t.transaction_date.startsWith(date))
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
