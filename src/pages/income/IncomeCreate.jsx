import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { transactionService } from '@/services/transactions'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'
import ReceiptUploader from '@/components/receipt/ReceiptUploader'
import toast from 'react-hot-toast'
import { compressImage } from '@/utils/imageCompression'

const IncomeCreate = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    source: '',
    amount: '',
    description: '',
    volume: '',
    unit: '',
    unitPrice: '',
  })
  const [receiptFile, setReceiptFile] = useState(null)
  const [errors, setErrors] = useState({})

  // Auto-calculate amount
  useEffect(() => {
    const vol = Number(form.volume) || 0
    const price = Number(form.unitPrice) || 0
    setForm(prev => ({ ...prev, amount: (vol * price).toString() }))
  }, [form.volume, form.unitPrice])

  const mutation = useMutation({
    mutationFn: (data) => transactionService.createTransaction(data.tx, data.file, user.id),
    onSuccess: () => {
      toast.success('Pemasukan berhasil disimpan!')
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      navigate('/income')
    },
    onError: (err) => toast.error(err.message || 'Gagal menyimpan pemasukan'),
  })

  const validate = () => {
    const e = {}
    if (!form.transaction_date) e.transaction_date = 'Tanggal wajib diisi'
    if (!form.source.trim()) e.source = 'Sumber pemasukan wajib diisi'
    if (!form.volume || Number(form.volume) <= 0) e.volume = 'Volume wajib diisi'
    if (!form.unit) e.unit = 'Satuan wajib dipilih'
    if (!form.unitPrice || Number(form.unitPrice) <= 0) e.unitPrice = 'Harga satuan wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    let finalDescription = form.description.trim() || null
    if (form.volume && form.unitPrice) {
      const detailStr = `[${form.volume} ${form.unit || 'Item'} x Rp ${Number(form.unitPrice).toLocaleString('id-ID')}]`
      finalDescription = finalDescription ? `${detailStr} ${finalDescription}` : detailStr
    }

    const txData = {
      type: 'INCOME',
      transaction_date: form.transaction_date,
      source: form.source.trim(),
      amount: Number(form.amount),
      description: finalDescription,
      category_id: null,
    }

    mutation.mutate({ tx: txData, file: receiptFile })
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const formatAmountDisplay = (val) => {
    const num = val.replace(/\D/g, '')
    return num ? Number(num).toLocaleString('id-ID') : ''
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} />
        </button>
        <div>
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">Tambah Pemasukan</h1>
          <p className="text-xs text-slate-500">Catat transaksi pemasukan baru</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 space-y-4">
          {/* Tanggal */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Tanggal <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              className={`input-field ${errors.transaction_date ? 'border-red-500/50' : ''}`}
              value={form.transaction_date}
              onChange={e => handleChange('transaction_date', e.target.value)}
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
              placeholder="Contoh: Donasi kegiatan, Iuran anggota..."
              value={form.source}
              onChange={e => handleChange('source', e.target.value)}
            />
            {errors.source && <p className="text-xs text-red-400 mt-1">{errors.source}</p>}
          </div>

          {/* Rincian Biaya */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
            <div>
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Volume *</label>
              <input type="number" min="1" step="any"
                className={`input-field !py-1.5 !text-xs ${errors.volume ? 'border-red-500/50' : ''}`}
                placeholder="0"
                value={form.volume}
                onChange={e => handleChange('volume', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Satuan *</label>
              <select
                className={`input-field !py-1.5 !text-xs ${errors.unit ? 'border-red-500/50' : ''}`}
                value={form.unit}
                onChange={e => handleChange('unit', e.target.value)}
              >
                <option value="">-- Pilih --</option>
                <option value="Orang">Orang</option>
                <option value="Pcs">Pcs</option>
                <option value="Set">Set</option>
                <option value="Paket">Paket</option>
                <option value="Buah">Buah</option>
                <option value="Lembar">Lembar</option>
                <option value="Liter">Liter</option>
                <option value="Kg">Kg</option>
                <option value="Gram">Gram</option>
                <option value="Meter">Meter</option>
                <option value="Karton">Karton/Dus</option>
                <option value="Rim">Rim</option>
                <option value="Bungkus">Bungkus</option>
                <option value="Kegiatan">Kegiatan</option>
                <option value="Hari">Hari</option>
                <option value="Bulan">Bulan</option>
                <option value="Tahun">Tahun</option>
                <option value="Lainnya">Lainnya...</option>
              </select>
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

          {/* Nominal */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Nominal (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 text-sm font-medium">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                className={`input-field pl-9 currency ${errors.amount ? 'border-red-500/50' : ''} bg-slate-100 dark:bg-slate-900 opacity-70`}
                placeholder="0"
                value={form.amount ? formatAmountDisplay(form.amount.toString()) : ''}
                disabled={true}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '')
                  handleChange('amount', raw)
                }}
              />
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Nominal dihitung otomatis dari rincian.</p>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Keterangan</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Keterangan tambahan (opsional)..."
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
            />
          </div>

          {/* Petugas */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Petugas</label>
            <input
              type="text"
              className="input-field opacity-60"
              value={profile?.full_name || 'Loading...'}
              disabled
            />
          </div>
        </div>

        {/* Receipt */}
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            Foto Nota / Bukti (Opsional)
          </label>
          <ReceiptUploader
            value={receiptFile}
            onChange={setReceiptFile}
            error={errors.receipt}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-success w-full btn-lg"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Spinner size={16} /> : <Save size={16} />}
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Pemasukan'}
        </button>
      </form>
    </div>
  )
}

export default IncomeCreate
