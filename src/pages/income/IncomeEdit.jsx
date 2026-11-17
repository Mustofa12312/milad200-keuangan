import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { transactionService } from '@/services/transactions'
import { useAuth } from '@/contexts/auth'
import { Spinner } from '@/components/ui'
import ReceiptUploader from '@/components/receipt/ReceiptUploader'
import toast from 'react-hot-toast'

const IncomeEdit = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: tx, isLoading } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionService.getTransactionById(id),
  })

  const { data: initialReceiptUrl } = useQuery({
    queryKey: ['transaction-receipt-url', id, tx?.receipts?.[0]?.storage_path],
    queryFn: () => transactionService.getSignedUrl(tx.receipts[0].storage_path),
    enabled: !!tx?.receipts?.[0]?.storage_path,
    staleTime: 60000,
  })

  const [form, setForm] = useState({
    transaction_date: '',
    source: '',
    amount: '',
    description: '',
  })
  const [receiptFile, setReceiptFile] = useState(undefined)
  const [errors, setErrors] = useState({})
  const [loadedId, setLoadedId] = useState(null)

  if (tx && tx.id !== loadedId) {
    setLoadedId(tx.id)
    setForm({
      transaction_date: tx.transaction_date || '',
      source: tx.source || '',
      amount: tx.amount ? String(tx.amount) : '',
      description: tx.description || '',
    })
  }

  const mutation = useMutation({
    mutationFn: ({ txData, receiptFileToSave }) =>
      transactionService.updateTransaction(id, txData, user.id, receiptFileToSave),
    onSuccess: () => {
      toast.success('Pemasukan berhasil diperbarui!')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction', id] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['income-summary'] })
      navigate('/income')
    },
    onError: (err) => toast.error(err.message || 'Gagal memperbarui transaksi'),
  })

  const validate = () => {
    const errs = {}
    if (!form.transaction_date) errs.transaction_date = 'Tanggal wajib diisi'
    if (!form.source.trim()) errs.source = 'Sumber pemasukan wajib diisi'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Nominal harus lebih dari 0'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    mutation.mutate({
      txData: {
        transaction_date: form.transaction_date,
        source: form.source.trim(),
        amount: Number(form.amount),
        description: form.description.trim() || null,
      },
      receiptFileToSave: receiptFile,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={24} />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} />
        </button>
        <div>
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">Edit Pemasukan</h1>
          <p className="text-xs text-slate-500">Perbarui data transaksi pemasukan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-500 dark:text-amber-400">⚠️ Perubahan ini akan dicatat di Audit Log</p>
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Tanggal <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              className={`input-field ${errors.transaction_date ? 'border-red-500/50' : ''}`}
              value={form.transaction_date}
              onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.transaction_date && <p className="text-xs text-red-400 mt-1">{errors.transaction_date}</p>}
          </div>

          {/* Sumber */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Sumber Pemasukan <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className={`input-field ${errors.source ? 'border-red-500/50' : ''}`}
              placeholder="Contoh: Donasi kegiatan, Iuran alumni..."
              value={form.source}
              onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
            />
            {errors.source && <p className="text-xs text-red-400 mt-1">{errors.source}</p>}
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Nominal (Rp) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                className={`input-field !pl-10 currency ${errors.amount ? 'border-red-500/50' : ''}`}
                value={form.amount ? Number(form.amount).toLocaleString('id-ID') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '')
                  setForm(p => ({ ...p, amount: raw }))
                }}
              />
            </div>
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Keterangan</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Keterangan tambahan (opsional)..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>

        {/* Foto Nota / Bukti Transfer */}
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            Foto Nota / Bukti Transfer <span className="text-slate-400 font-normal">(Opsional)</span>
          </label>
          <ReceiptUploader
            initialUrl={initialReceiptUrl}
            onChange={(file) => setReceiptFile(file)}
            error={errors.receipt}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary w-full btn-lg"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Spinner size={16} /> : <Save size={16} />}
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  )
}

export default IncomeEdit
