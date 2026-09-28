import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { transactionService } from '@/services/transactions'
import { categoryService } from '@/services/categories'
import { formatCurrency } from '@/utils/format'
import { useAuth } from '@/contexts/AuthContext'
import { ConfirmDialog, StatCard } from '@/components/ui'
import FilterBar from '@/components/ui/FilterBar'
import TransactionTable from '@/components/tables/TransactionTable'
import toast from 'react-hot-toast'

const ExpenseList = () => {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('transaction_date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [deleteId, setDeleteId] = useState(null)

  const handleSearch = useCallback((val) => {
    setSearch(val)
    clearTimeout(window.__expenseSearchTimer)
    window.__expenseSearchTimer = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }, [])

  const handleReset = () => {
    setSearch('')
    setDebouncedSearch('')
    setStartDate('')
    setEndDate('')
    setCategoryFilter('')
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'EXPENSE', page, debouncedSearch, startDate, endDate, categoryFilter, sortBy, sortOrder],
    queryFn: () => transactionService.getTransactions({
      type: 'EXPENSE',
      page,
      pageSize: 20,
      search: debouncedSearch,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category_id: categoryFilter || undefined,
      sortBy,
      sortOrder,
    }),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(true),
  })

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: transactionService.getSummary,
    staleTime: 30000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.softDelete(id, user.id),
    onSuccess: () => {
      toast.success('Transaksi berhasil dibatalkan')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal membatalkan'),
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-slate-100">Pengeluaran</h1>
          <p className="text-xs text-slate-500">
            {data?.count != null ? `${data.count} transaksi ditemukan` : 'Kelola semua transaksi pengeluaran'}
          </p>
        </div>
        <Link to="/expense/create" className="btn btn-danger btn-sm">
          <Plus size={14} /> Tambah
        </Link>
      </div>

      {/* Quick stat */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Total Pengeluaran"
          value={formatCurrency(summary?.expense ?? 0)}
          icon={TrendingDown}
          color="red"
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
        filterCount={categoryFilter ? 1 : 0}
      >
        {/* Category filter slot */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            Kategori
          </label>
          <select
            className="input-field text-sm"
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
          >
            <option value="">Semua Kategori</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </FilterBar>

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
          type="EXPENSE"
          onDelete={setDeleteId}
          isAdmin={isAdmin}
          loading={isLoading}
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Batalkan Pengeluaran?"
        message="Transaksi pengeluaran ini akan dibatalkan dan tidak dihitung dalam laporan. Bisa dipulihkan melalui Admin."
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

export default ExpenseList
