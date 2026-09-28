import { useState } from 'react'
import { Edit2, Trash2, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatDate, truncate } from '@/utils/format'
import { Pagination, EmptyState, Badge } from '@/components/ui'
import ReceiptViewModal from '@/components/receipt/ReceiptViewModal'

/**
 * Reusable transaction table used by both IncomeList and ExpenseList
 */
const TransactionTable = ({
  data,
  totalPages,
  page,
  onPageChange,
  type = 'INCOME', // 'INCOME' | 'EXPENSE'
  onDelete,
  isAdmin,
  loading,
}) => {
  const navigate = useNavigate()
  const [viewReceipt, setViewReceipt] = useState(null)

  const isIncome = type === 'INCOME'
  const basePath = isIncome ? '/income' : '/expense'
  const color = isIncome ? 'emerald' : 'red'
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight
  const iconBg = isIncome ? 'bg-emerald-500/15' : 'bg-red-500/15'
  const iconColor = isIncome ? 'text-emerald-400' : 'text-red-400'
  const amountPrefix = isIncome ? '+' : '-'

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-32" />
              <div className="skeleton h-2.5 w-24" />
            </div>
            <div className="skeleton h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={Icon}
        title={`Belum ada ${isIncome ? 'pemasukan' : 'pengeluaran'}`}
        description={`Mulai catat ${isIncome ? 'pemasukan' : 'pengeluaran'} pertama Anda`}
      />
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Tanggal</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">
                {isIncome ? 'Sumber' : 'Kategori'}
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 hidden md:table-cell">Keterangan</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 hidden lg:table-cell">Petugas</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Nominal</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-400">Nota</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map(tx => (
              <tr key={tx.id} className="table-row-hover group">
                <td className="px-5 py-3.5 text-sm text-slate-300 whitespace-nowrap">
                  {formatDate(tx.transaction_date)}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={13} className={iconColor} />
                    </div>
                    <span className="text-sm font-medium text-slate-200 truncate max-w-36">
                      {isIncome ? tx.source : tx.categories?.name || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-400 hidden md:table-cell">
                  {truncate(tx.description, 35) || '—'}
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500 hidden lg:table-cell">
                  {tx.creator?.full_name || '—'}
                </td>
                <td className={`px-5 py-3.5 text-sm font-semibold text-right currency whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                  {amountPrefix}{formatCurrency(tx.amount)}
                </td>
                <td className="px-5 py-3.5">
                  {tx.receipts?.length > 0 ? (
                    <button
                      onClick={() => setViewReceipt(tx.receipts[0])}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <Eye size={11} /> Lihat
                    </button>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`${basePath}/${tx.id}/edit`)}
                      className="btn btn-ghost btn-xs"
                      title="Edit"
                    >
                      <Edit2 size={11} />
                    </button>
                    {isAdmin && onDelete && (
                      <button
                        onClick={() => onDelete(tx.id)}
                        className="btn btn-ghost btn-xs text-red-400 hover:text-red-300"
                        title="Batalkan"
                      >
                        <Trash2 size={11} />
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
        {data.map(tx => (
          <div key={tx.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {isIncome ? tx.source : tx.categories?.name || 'Pengeluaran'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDate(tx.transaction_date)} · {tx.creator?.full_name || '-'}
                </p>
              </div>
              <p className={`text-sm font-bold currency flex-shrink-0 ml-3 ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                {amountPrefix}{formatCurrency(tx.amount)}
              </p>
            </div>
            {tx.description && (
              <p className="text-xs text-slate-500 mb-2 truncate">{tx.description}</p>
            )}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate(`${basePath}/${tx.id}/edit`)}
                className="btn btn-ghost btn-xs"
              >
                <Edit2 size={11} /> Edit
              </button>
              {tx.receipts?.length > 0 && (
                <button
                  onClick={() => setViewReceipt(tx.receipts[0])}
                  className="btn btn-ghost btn-xs text-blue-400"
                >
                  <Eye size={11} /> Nota
                </button>
              )}
              {isAdmin && onDelete && (
                <button
                  onClick={() => onDelete(tx.id)}
                  className="btn btn-ghost btn-xs text-red-400"
                >
                  <Trash2 size={11} /> Batalkan
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="px-5 pb-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>

      {/* Receipt viewer */}
      {viewReceipt && (
        <ReceiptViewModal
          receipt={viewReceipt}
          onClose={() => setViewReceipt(null)}
        />
      )}
    </>
  )
}

export default TransactionTable
