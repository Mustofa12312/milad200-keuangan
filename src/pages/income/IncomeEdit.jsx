import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { transactionService } from '@/services/transactions'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'
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

  const [form, setForm] = useState({ transaction_date: '', source: '', amount: '', description: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (tx) {
      setForm({
        transaction_date: tx.transaction_date,
        source: tx.source || '',
        amount: tx.amount?.toString() || '',
        description: tx.description || '',
      })
    }
  }, [tx])

  const mutation = useMutation({
    mutationFn: (updates) => transactionService.updateTransaction(id, updates, user.id),
    onSuccess: () => {
      toast.success('Pemasukan berhasil diperbarui!')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      navigate('/income')
    },
    onError: (err) => toast.error(err.message || 'Gagal memperbarui'),
  })

  const validate = () => {
    const e = {}
    if (!form.transaction_date) e.transaction_date = 'Tanggal wajib diisi'
    if (!form.source.trim()) e.source = 'Sumber wajib diisi'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Nominal harus lebih dari 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      transaction_date: form.transaction_date,
      source: form.source.trim(),
      amount: Number(form.amount),
      description: form.description.trim() || null,
    })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Spinner size={24} />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /></button>
        <div>
          <h1 className="text-lg font-bold font-display text-slate-100">Edit Pemasukan</h1>
          <p className="text-xs text-slate-500">Perbarui data transaksi pemasukan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass rounded-xl border border-white/5 p-5 space-y-4">
          {/* Warning banner */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400">⚠️ Perubahan ini akan dicatat di Audit Log</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tanggal *</label>
            <input type="date" className={`input-field ${errors.transaction_date ? 'border-red-500/50' : ''}`}
              value={form.transaction_date} onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))} />
            {errors.transaction_date && <p className="text-xs text-red-400 mt-1">{errors.transaction_date}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Sumber *</label>
            <input type="text" className={`input-field ${errors.source ? 'border-red-500/50' : ''}`}
              value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} />
            {errors.source && <p className="text-xs text-red-400 mt-1">{errors.source}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nominal (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
              <input type="text" inputMode="numeric"
                className={`input-field pl-9 currency ${errors.amount ? 'border-red-500/50' : ''}`}
                value={form.amount ? Number(form.amount).toLocaleString('id-ID') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '')
                  setForm(p => ({ ...p, amount: raw }))
                }} />
            </div>
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Keterangan</label>
            <textarea className="input-field resize-none" rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full btn-lg" disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner size={16} /> : <Save size={16} />}
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  )
}

export default IncomeEdit
