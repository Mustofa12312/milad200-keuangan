import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { transactionService } from '@/services/transactions'
import { categoryService } from '@/services/categories'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'
import ReceiptUploader from '@/components/receipt/ReceiptUploader'
import toast from 'react-hot-toast'

const ExpenseCreate = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    category_id: '',
    amount: '',
    description: '',
  })
  const [receiptFile, setReceiptFile] = useState(null)
  const [errors, setErrors] = useState({})

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  })

  const mutation = useMutation({
    mutationFn: (data) => transactionService.createTransaction(data.tx, data.file, user.id),
    onSuccess: () => {
      toast.success('Pengeluaran berhasil disimpan!')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      navigate('/expense')
    },
    onError: (err) => toast.error(err.message || 'Gagal menyimpan pengeluaran'),
  })

  const validate = () => {
    const e = {}
    if (!form.transaction_date) e.transaction_date = 'Tanggal wajib diisi'
    if (!form.category_id) e.category_id = 'Kategori wajib dipilih'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Nominal harus lebih dari 0'
    if (!receiptFile) e.receipt = 'Foto nota wajib dilampirkan'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      tx: {
        type: 'EXPENSE',
        transaction_date: form.transaction_date,
        category_id: form.category_id,
        source: null,
        amount: Number(form.amount),
        description: form.description.trim() || null,
      },
      file: receiptFile,
    })
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /></button>
        <div>
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">Tambah Pengeluaran</h1>
          <p className="text-xs text-slate-500">Catat transaksi pengeluaran baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Tanggal *</label>
            <input type="date" className={`input-field ${errors.transaction_date ? 'border-red-500/50' : ''}`}
              value={form.transaction_date}
              onChange={e => handleChange('transaction_date', e.target.value)}
              max={new Date().toISOString().split('T')[0]} />
            {errors.transaction_date && <p className="text-xs text-red-400 mt-1">{errors.transaction_date}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Kategori *</label>
            <select
              className={`input-field ${errors.category_id ? 'border-red-500/50' : ''}`}
              value={form.category_id}
              onChange={e => handleChange('category_id', e.target.value)}
            >
              <option value="">-- Pilih Kategori --</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="text-xs text-red-400 mt-1">{errors.category_id}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nominal (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 text-sm font-medium">Rp</span>
              <input type="text" inputMode="numeric"
                className={`input-field pl-9 currency ${errors.amount ? 'border-red-500/50' : ''}`}
                placeholder="0"
                value={form.amount ? Number(form.amount).toLocaleString('id-ID') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '')
                  handleChange('amount', raw)
                }} />
            </div>
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Keterangan</label>
            <textarea className="input-field resize-none" rows={3}
              placeholder="Keterangan pengeluaran (opsional)..."
              value={form.description}
              onChange={e => handleChange('description', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Petugas</label>
            <input type="text" className="input-field opacity-60" value={profile?.full_name || ''} disabled />
          </div>
        </div>

        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            Foto Nota <span className="text-red-400">*</span>
          </label>
          <ReceiptUploader value={receiptFile} onChange={setReceiptFile} required error={errors.receipt} />
        </div>

        <button type="submit" className="btn btn-danger w-full btn-lg" disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner size={16} /> : <Save size={16} />}
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengeluaran'}
        </button>
      </form>
    </div>
  )
}

export default ExpenseCreate
