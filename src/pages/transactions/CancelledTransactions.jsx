import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, RotateCcw, Search, AlertTriangle } from 'lucide-react'
import supabase from '@/services/supabase'
import { logAudit } from '@/services/auditLog'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'
import { EmptyState, Pagination, ConfirmDialog, Badge } from '@/components/ui'
import toast from 'react-hot-toast'

const CancelledTransactions = () => {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [restoreId, setRestoreId] = useState(null)

  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['cancelled-transactions', page, search],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          categories(name),
          deleter:profiles!transactions_deleted_by_fkey(full_name),
          creator:profiles!transactions_created_by_fkey(full_name)
        `, { count: 'exact' })
        .eq('is_deleted', true)

      if (search) {
        query = query.or(`source.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await query
        .order('deleted_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { data, count, totalPages: Math.ceil(count / pageSize) }
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('transactions')
        .update({ is_deleted: false, deleted_by: null, deleted_at: null })
        .eq('id', id)
      if (error) throw error
      await logAudit(user.id, 'RESTORE', 'transaction', id, null, null)
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil dipulihkan!')
      qc.invalidateQueries({ queryKey: ['cancelled-transactions'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      setRestoreId(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal memulihkan transaksi'),
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold font-display text-slate-100">Transaksi Dibatalkan</h1>
        <p className="text-xs text-slate-500">Riwayat transaksi yang telah dibatalkan oleh Admin</p>
      </div>

      <div className="glass rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Data di halaman ini hanya dapat dilihat oleh Admin. Transaksi yang dibatalkan tidak dihapus dari database, sehingga dapat dipulihkan kapan saja.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="glass rounded-xl border border-white/5 p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari transaksi dibatalkan..."
            className="input-field pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : data?.data?.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Tanggal</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Jenis</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Keterangan</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Nominal</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 hidden md:table-cell">Dibatalkan oleh</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 hidden lg:table-cell">Waktu Pembatalan</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.data.map(tx => (
                    <tr key={tx.id} className="table-row-hover opacity-70 hover:opacity-100 transition-opacity">
                      <td className="px-5 py-3.5 text-sm text-slate-300">{formatDate(tx.transaction_date)}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          type={tx.type}
                          label={tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {tx.source || tx.categories?.name || tx.description || '-'}
                      </td>
                      <td className={`px-5 py-3.5 text-sm font-semibold currency line-through ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 hidden md:table-cell">
                        {tx.deleter?.full_name || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 hidden lg:table-cell">
                        {formatDateTime(tx.deleted_at) || '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setRestoreId(tx.id)}
                          className="btn btn-ghost btn-xs text-emerald-400 hover:text-emerald-300"
                          title="Pulihkan transaksi"
                        >
                          <RotateCcw size={12} /> Pulihkan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 pb-4">
              <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <div className="py-12">
            <EmptyState
              icon={Trash2}
              title="Tidak ada transaksi dibatalkan"
              description="Transaksi yang dibatalkan oleh Admin akan muncul di sini"
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!restoreId}
        title="Pulihkan Transaksi?"
        message="Transaksi akan dipulihkan dan kembali dihitung dalam laporan keuangan."
        loading={restoreMutation.isPending}
        onConfirm={() => restoreMutation.mutate(restoreId)}
        onCancel={() => setRestoreId(null)}
      />
    </div>
  )
}

export default CancelledTransactions
