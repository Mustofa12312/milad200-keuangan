import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { transactionService } from '@/services/transactions'
import { formatCurrency } from '@/utils/format'
import { useAuth } from '@/contexts/AuthContext'
import { ConfirmDialog, StatCard } from '@/components/ui'
import FilterBar from '@/components/ui/FilterBar'
import TransactionTable from '@/components/tables/TransactionTable'
import toast from 'react-hot-toast'

const IncomeList = () => {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('transaction_date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [deleteId, setDeleteId] = useState(null)

  const handleSearch = useCallback((val) => {
    setSearch(val)
    clearTimeout(window.__incomeSearchTimer)
    window.__incomeSearchTimer = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }, [])

  const handleReset = () => {
    setSearch('')
    setDebouncedSearch('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'INCOME', page, debouncedSearch, startDate, endDate, sortBy, sortOrder],
    queryFn: () => transactionService.getTransactions({
      type: 'INCOME',
      page,
      pageSize: 20,
      search: debouncedSearch,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy,
      sortOrder,
    }),
  })

  // Summary for this filter context
  const { data: summary } = useQuery({
    queryKey: ['income-summary'],
    queryFn: transactionService.getSummary,
    staleTime: 30000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.softDelete(id, user.id),
    onSuccess: () => {
      toast.success('Transaksi berhasil dibatalkan')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['income-summary'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal membatalkan'),
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-slate-100">Pemasukan</h1>
          <p className="text-xs text-slate-500">
            {data?.count != null ? `${data.count} transaksi ditemukan` : 'Kelola semua transaksi pemasukan'}
          </p>
        </div>
        <Link to="/income/create" className="btn btn-success btn-sm">
          <Plus size={14} /> Tambah
        </Link>
      </div>

      {/* Quick stat */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Total Pemasukan"
          value={formatCurrency(summary?.income ?? 0)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Hasil Filter"
          value={`${data?.count ?? 0} transaksi`}
          color="blue"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearch={handleSearch}
        startDate={startDate}
        onStartDate={(v) => { setStartDate(v); setPage(1) }}
        endDate={endDate}
        onEndDate={(v) => { setEndDate(v); setPage(1) }}
        onReset={handleReset}
      />

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Urutkan:</span>
        {[
          { key: 'transaction_date', label: 'Tanggal' },
          { key: 'amount', label: 'Nominal' },
          { key: 'created_at', label: 'Terbaru' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              if (sortBy === key) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
              else { setSortBy(key); setSortOrder('desc') }
            }}
            className={`btn btn-xs ${sortBy === key ? 'btn-primary' : 'btn-ghost'}`}
          >
            {label}
            {sortBy === key && <span className="ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        <TransactionTable
          data={data?.data}
          totalPages={data?.totalPages}
          page={page}
          onPageChange={setPage}
          type="INCOME"
          onDelete={setDeleteId}
          isAdmin={isAdmin}
          loading={isLoading}
        />
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!deleteId}
        title="Batalkan Pemasukan?"
        message="Transaksi pemasukan ini akan dibatalkan dan tidak dihitung dalam saldo. Bisa dipulihkan melalui Admin."
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

export default IncomeList
