import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, Edit2, Trash2, ArrowUpRight, Eye } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { transactionService } from '@/services/transactions'
import { categoryService } from '@/services/categories'
import { userService } from '@/services/users'
import { formatCurrency, formatDate, truncate } from '@/utils/format'
import { useAuth } from '@/contexts/AuthContext'
import { EmptyState, Pagination, ConfirmDialog, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import ReceiptViewModal from '@/components/receipt/ReceiptViewModal'

const IncomeList = () => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('transaction_date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [deleteId, setDeleteId] = useState(null)
  const [viewReceipt, setViewReceipt] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Debounce search
  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(window._searchTimer)
    window._searchTimer = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
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

  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.softDelete(id, user.id),
    onSuccess: () => {
      toast.success('Transaksi berhasil dibatalkan')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal membatalkan transaksi'),
  })

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-slate-600 ml-0.5">↕</span>
    return <span className="text-blue-400 ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-slate-100">Pemasukan</h1>
          <p className="text-xs text-slate-500">Kelola semua transaksi pemasukan</p>
        </div>
        <Link to="/income/create" className="btn btn-success btn-sm">
          <Plus size={14} /> Tambah Pemasukan
        </Link>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl border border-white/5 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari sumber, keterangan..."
              className="input-field pl-9"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <button
            className={`btn btn-ghost btn-sm flex-shrink-0 ${showFilters ? 'text-blue-400' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} /> Filter
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-white/5 animate-fade-in">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Dari Tanggal</label>
              <input type="date" className="input-field" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Sampai Tanggal</label>
              <input type="date" className="input-field" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} />
            </div>
            <div className="flex items-end">
              <button
                className="btn btn-ghost btn-sm w-full"
                onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setDebouncedSearch(''); setPage(1) }}
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : data?.data?.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 cursor-pointer" onClick={() => handleSort('transaction_date')}>
                      Tanggal <SortIcon field="transaction_date" />
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Sumber</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 hidden md:table-cell">Keterangan</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 cursor-pointer" onClick={() => handleSort('amount')}>
                      Nominal <SortIcon field="amount" />
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 hidden lg:table-cell">Petugas</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Nota</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.data.map(tx => (
                    <tr key={tx.id} className="table-row-hover">
                      <td className="px-5 py-3.5 text-sm text-slate-300">{formatDate(tx.transaction_date)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                            <ArrowUpRight size={14} className="text-emerald-400" />
                          </div>
                          <span className="text-sm font-medium text-slate-200 truncate max-w-32">{tx.source}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400 hidden md:table-cell">{truncate(tx.description, 40) || '-'}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-emerald-400 currency">{formatCurrency(tx.amount)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 hidden lg:table-cell">{tx.creator?.full_name || '-'}</td>
                      <td className="px-5 py-3.5">
                        {tx.receipts?.length > 0 ? (
                          <button
                            onClick={() => setViewReceipt(tx.receipts[0])}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                          >
                            <Eye size={12} /> Lihat
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => navigate(`/income/${tx.id}/edit`)}
                            className="btn btn-ghost btn-xs"
                          >
                            <Edit2 size={12} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteId(tx.id)}
                              className="btn btn-ghost btn-xs text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-white/5">
              {data.data.map(tx => (
                <div key={tx.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{tx.source}</p>
                      <p className="text-xs text-slate-500">{formatDate(tx.transaction_date)} • {tx.creator?.full_name}</p>
                    </div>
                    <p className="text-base font-bold text-emerald-400 currency">+{formatCurrency(tx.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/income/${tx.id}/edit`)} className="btn btn-ghost btn-xs">
                      <Edit2 size={11} /> Edit
                    </button>
                    {tx.receipts?.length > 0 && (
                      <button onClick={() => setViewReceipt(tx.receipts[0])} className="btn btn-ghost btn-xs text-blue-400">
                        <Eye size={11} /> Nota
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-4">
              <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <div className="py-12">
            <EmptyState
              icon={ArrowUpRight}
              title="Belum ada pemasukan"
              description="Mulai catat pemasukan pertama Anda"
              action={
                <Link to="/income/create" className="btn btn-success btn-sm">
                  <Plus size={14} /> Tambah Pemasukan
                </Link>
              }
            />
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Batalkan Transaksi?"
        message="Transaksi akan dibatalkan dan tidak muncul di laporan. Tindakan ini dapat dilihat di Audit Log."
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Receipt viewer */}
      {viewReceipt && (
        <ReceiptViewModal receipt={viewReceipt} onClose={() => setViewReceipt(null)} />
      )}
    </div>
  )
}

export default IncomeList
