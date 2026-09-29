import { useState, useEffect } from 'react'
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
    volume: '',
    unit: '',
    unitPrice: '',
  })
  const [useDetails, setUseDetails] = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)
  const [errors, setErrors] = useState({})

  // Auto-calculate amount if useDetails is true
  useEffect(() => {
    if (useDetails) {
      const vol = Number(form.volume) || 0
      const price = Number(form.unitPrice) || 0
      setForm(prev => ({ ...prev, amount: (vol * price).toString() }))
    }
  }, [form.volume, form.unitPrice, useDetails])

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
    if (useDetails) {
      if (!form.volume || Number(form.volume) <= 0) e.volume = 'Volume wajib diisi'
      if (!form.unitPrice || Number(form.unitPrice) <= 0) e.unitPrice = 'Harga satuan wajib diisi'
    } else {
      if (!form.amount || Number(form.amount) <= 0) e.amount = 'Nominal harus lebih dari 0'
    }
    
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    let finalDescription = form.description.trim() || null
    if (useDetails && form.volume && form.unitPrice) {
      const detailStr = `[${form.volume} ${form.unit || 'Item'} x Rp ${Number(form.unitPrice).toLocaleString('id-ID')}]`
      finalDescription = finalDescription ? `${detailStr} ${finalDescription}` : detailStr
    }

    mutation.mutate({
      tx: {
        type: 'EXPENSE',
        transaction_date: form.transaction_date,
        category_id: form.category_id,
        source: null,
        amount: Number(form.amount),
        description: finalDescription,
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

          {/* Rincian Biaya Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5">
            <div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Gunakan Rincian Biaya</p>
              <p className="text-[10px] text-slate-500">Hitung nominal otomatis (Volume × Harga)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={useDetails} onChange={() => setUseDetails(!useDetails)} />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>

          {useDetails && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Volume *</label>
                <input type="number" min="1" step="any"
                  className={`input-field !py-1.5 !text-xs ${errors.volume ? 'border-red-500/50' : ''}`}
                  placeholder="0"
                  value={form.volume}
                  onChange={e => handleChange('volume', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Satuan</label>
                <input type="text"
                  className="input-field !py-1.5 !text-xs"
                  placeholder="Pcs/Org/Set"
                  value={form.unit}
                  onChange={e => handleChange('unit', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Harga Satuan *</label>
                <input type="text" inputMode="numeric"
                  className={`input-field !py-1.5 !text-xs currency ${errors.unitPrice ? 'border-red-500/50' : ''}`}
                  placeholder="0"
                  value={form.unitPrice ? Number(form.unitPrice).toLocaleString('id-ID') : ''}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '')
                    handleChange('unitPrice', raw)
                  }} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nominal (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 text-sm font-medium">Rp</span>
              <input type="text" inputMode="numeric"
                className={`input-field pl-9 currency ${errors.amount ? 'border-red-500/50' : ''} ${useDetails ? 'bg-slate-100 dark:bg-slate-900 opacity-70' : ''}`}
                placeholder="0"
                value={form.amount ? Number(form.amount).toLocaleString('id-ID') : ''}
                disabled={useDetails}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '')
                  handleChange('amount', raw)
                }} />
            </div>
            {errors.amount && !useDetails && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
            {useDetails && <p className="text-[10px] text-blue-500 mt-1">Nominal dihitung otomatis dari rincian biaya.</p>}
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
            Foto Nota (Opsional)
          </label>
          <ReceiptUploader value={receiptFile} onChange={setReceiptFile} error={errors.receipt} />
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
