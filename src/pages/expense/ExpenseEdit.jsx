import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Settings2 } from 'lucide-react'
import { transactionService } from '@/services/transactions'
import { categoryService } from '@/services/categories'
import { eventService } from '@/services/events'
import { useAuth } from '@/contexts/auth'
import { Spinner } from '@/components/ui'
import ManageEventsModal from '@/components/events/ManageEventsModal'
import ManageCategoriesModal from '@/components/categories/ManageCategoriesModal'
import EventBudgetAlert from '@/components/budget/EventBudgetAlert'
import ReceiptUploader from '@/components/receipt/ReceiptUploader'
import toast from 'react-hot-toast'

const STANDARD_UNITS = [
  'Orang', 'Pcs', 'Set', 'Paket', 'Buah', 'Lembar', 'Liter', 'Kg', 'Gram',
  'Meter', 'Karton/Dus', 'Rim', 'Bungkus', 'Kegiatan', 'Hari', 'Bulan', '1 Nota', 'Tahun'
]

const parseExpenseDescription = (desc, amount) => {
  const match = desc?.match(/^\[([\d.,]+)\s+(.*?)\s+x\s+Rp\s*([\d.,]+)\]\s*([\s\S]*)$/)
  if (match) {
    const rawVolume = match[1].replace(',', '.')
    const unitParsed = match[2].trim()
    const rawPrice = match[3].replace(/\D/g, '')
    const cleanDesc = match[4].trim()

    return {
      volume: rawVolume || '1',
      unit: unitParsed || '',
      unitPrice: rawPrice || (amount ? String(amount) : ''),
      description: cleanDesc,
    }
  }

  return {
    volume: '1',
    unit: '1 Nota',
    unitPrice: amount ? String(amount) : '',
    description: desc || '',
  }
}

const ExpenseEdit = () => {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showManageEvents, setShowManageEvents] = useState(false)
  const [showManageCategories, setShowManageCategories] = useState(false)

  const { data: tx, isLoading } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionService.getTransactionById(id),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  })

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: eventService.getEvents,
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
    customSource: '',
    category_id: '',
    volume: '',
    unit: '',
    customUnit: '',
    unitPrice: '',
    description: '',
  })
  const [receiptFile, setReceiptFile] = useState(undefined)
  const [errors, setErrors] = useState({})
  const [loadedKey, setLoadedKey] = useState(null)

  const totalAmount = (Number(form.volume) || 0) * (Number(form.unitPrice) || 0)

  const currentKey = tx && events ? `${tx.id}-${events.length}` : null
  if (currentKey && currentKey !== loadedKey) {
    setLoadedKey(currentKey)
    const isKnownEvent = events.some(e => e.name === tx.source)
    const parsed = parseExpenseDescription(tx.description, tx.amount)
    const isStandardUnit = STANDARD_UNITS.includes(parsed.unit)

    setForm({
      transaction_date: tx.transaction_date || '',
      source: tx.source ? (isKnownEvent ? tx.source : 'Lainnya') : '',
      customSource: tx.source && !isKnownEvent ? tx.source : '',
      category_id: tx.category_id || '',
      volume: parsed.volume,
      unit: parsed.unit ? (isStandardUnit ? parsed.unit : 'Lainnya') : '',
      customUnit: parsed.unit && !isStandardUnit ? parsed.unit : '',
      unitPrice: parsed.unitPrice,
      description: parsed.description,
    })
  }

  const mutation = useMutation({
    mutationFn: ({ txData, file }) => transactionService.updateTransaction(id, txData, file, user.id),
    onSuccess: () => {
      toast.success('Pengeluaran berhasil diperbarui!')
      qc.invalidateQueries({ queryKey: ['transaction', id] })
      qc.invalidateQueries({ queryKey: ['transaction-receipt-url', id] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['budget-summary'] })
      navigate('/expense')
    },
    onError: (err) => toast.error(err.message || 'Gagal memperbarui'),
  })

  const validate = () => {
    const e = {}
    if (!form.transaction_date) e.transaction_date = 'Tanggal wajib diisi'
    if (!form.source) {
      e.source = 'Pos acara wajib dipilih'
    } else if (form.source === 'Lainnya' && (!form.customSource || !form.customSource.trim())) {
      e.customSource = 'Nama pos acara wajib diisi'
    }
    if (!form.category_id) e.category_id = 'Kategori wajib dipilih'
    if (!form.volume || Number(form.volume) <= 0) e.volume = 'Volume wajib diisi'
    if (!form.unit) {
      e.unit = 'Satuan wajib dipilih'
    } else if (form.unit === 'Lainnya' && (!form.customUnit || !form.customUnit.trim())) {
      e.customUnit = 'Satuan tambahan wajib diisi'
    }
    if (!form.unitPrice || Number(form.unitPrice) <= 0) e.unitPrice = 'Harga satuan wajib diisi'
    if (totalAmount <= 0) e.volume = 'Total nominal harus lebih dari 0'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    let finalDescription = form.description.trim() || null
    const resolvedUnit = form.unit === 'Lainnya' ? form.customUnit.trim() : form.unit
    const resolvedSource = form.source === 'Lainnya' ? form.customSource.trim() : form.source
    if (form.volume && form.unitPrice) {
      const detailStr = `[${form.volume} ${resolvedUnit || 'Item'} x Rp ${Number(form.unitPrice).toLocaleString('id-ID')}]`
      finalDescription = finalDescription ? `${detailStr} ${finalDescription}` : detailStr
    }

    mutation.mutate({
      txData: {
        transaction_date: form.transaction_date,
        category_id: form.category_id,
        source: resolvedSource || null,
        amount: totalAmount,
        description: finalDescription,
      },
      file: receiptFile,
    })
  }

  const handleChange = (field, value) => {
    setForm(p => {
      const next = { ...p, [field]: value }
      if (field === 'source' && value !== 'Lainnya') next.customSource = ''
      if (field === 'unit' && value !== 'Lainnya') next.customUnit = ''
      return next
    })
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }))
    if (field === 'source' && errors.customSource) setErrors(p => ({ ...p, customSource: undefined }))
    if (field === 'unit' && errors.customUnit) setErrors(p => ({ ...p, customUnit: undefined }))
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={24} /></div>

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /></button>
        <div>
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">Edit Pengeluaran</h1>
          <p className="text-xs text-slate-500">Perbarui data transaksi pengeluaran</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400">⚠️ Perubahan ini akan dicatat di Audit Log</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Tanggal *</label>
            <input type="date" className={`input-field ${errors.transaction_date ? 'border-red-500/50' : ''}`}
              value={form.transaction_date} onChange={e => handleChange('transaction_date', e.target.value)} />
            {errors.transaction_date && <p className="text-xs text-red-400 mt-1">{errors.transaction_date}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pos Acara / Kegiatan <span className="text-red-400">*</span>
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Sub-kegiatan Milad (Haul, Lomba, Bahsul Masail, Halaqoh, Wisuda, dll.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageEvents(true)}
                className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 transition-colors"
              >
                <Settings2 size={12} />
                Kelola Pos Acara
              </button>
            </div>
            <select
              className={`input-field ${errors.source ? 'border-red-500/50' : ''}`}
              value={form.source}
              onChange={e => handleChange('source', e.target.value)}
            >
              <option value="">-- Pilih Pos Acara / Kegiatan --</option>
              {events?.map(ev => (
                <option key={ev.id} value={ev.name}>{ev.name}</option>
              ))}
              <option value="Lainnya">Lainnya...</option>
            </select>
            {errors.source && <p className="text-xs text-red-400 mt-1">{errors.source}</p>}

            {form.source === 'Lainnya' && (
              <div className="mt-2 p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-900/30">
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nama Pos Acara Kustom <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={`input-field !py-1.5 !text-xs ${errors.customSource ? 'border-red-500/50' : ''}`}
                  placeholder="Ketik nama sub-acara..."
                  value={form.customSource}
                  onChange={e => handleChange('customSource', e.target.value)}
                  autoFocus
                />
                {errors.customSource && <p className="text-[10px] text-red-400 mt-1">{errors.customSource}</p>}
              </div>
            )}

            {/* Kontrol Anggaran (RAB) Alert */}
            <EventBudgetAlert
              eventName={form.source === 'Lainnya' ? form.customSource : form.source}
              currentAmount={totalAmount}
              initialAmount={tx?.source === (form.source === 'Lainnya' ? form.customSource : form.source) ? (Number(tx?.amount) || 0) : 0}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kategori Biaya <span className="text-red-400">*</span>
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Jenis belanja/kebutuhan (Konsumsi, ATK, Transportasi, Operasional, dll.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageCategories(true)}
                className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 transition-colors"
              >
                <Settings2 size={12} />
                Kelola Kategori
              </button>
            </div>
            <select className={`input-field ${errors.category_id ? 'border-red-500/50' : ''}`}
              value={form.category_id} onChange={e => handleChange('category_id', e.target.value)}>
              <option value="">-- Pilih Kategori Biaya --</option>
              {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            {errors.category_id && <p className="text-xs text-red-400 mt-1">{errors.category_id}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
            <div>
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Volume *</label>
              <input type="number" min="0.001" step="any"
                className={`input-field !py-1.5 !text-xs ${errors.volume ? 'border-red-500/50' : ''}`}
                placeholder="0"
                value={form.volume}
                onChange={e => handleChange('volume', e.target.value)} />
              {errors.volume && <p className="text-[10px] text-red-400 mt-1">{errors.volume}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Satuan *</label>
              <select
                className={`input-field !py-1.5 !text-xs ${errors.unit ? 'border-red-500/50' : ''}`}
                value={form.unit}
                onChange={e => handleChange('unit', e.target.value)}
              >
                <option value="">-- Pilih --</option>
                {STANDARD_UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
                <option value="Lainnya">Lainnya...</option>
              </select>
              {errors.unit && <p className="text-[10px] text-red-400 mt-1">{errors.unit}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">Harga Satuan *</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-medium">Rp</span>
                <input type="text" inputMode="numeric"
                  className={`input-field !py-1.5 !pl-7 !text-xs currency ${errors.unitPrice ? 'border-red-500/50' : ''}`}
                  placeholder="0"
                  value={form.unitPrice ? Number(form.unitPrice).toLocaleString('id-ID') : ''}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '')
                    handleChange('unitPrice', raw)
                  }} />
              </div>
              {errors.unitPrice && <p className="text-[10px] text-red-400 mt-1">{errors.unitPrice}</p>}
            </div>
          </div>

          {form.unit === 'Lainnya' && (
            <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-900/40">
              <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Satuan Tambahan / Kustom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className={`input-field !py-1.5 !text-xs ${errors.customUnit ? 'border-red-500/50' : ''}`}
                placeholder="Contoh: Botol, Porsi, Box, Galon, Kotak, Cup, dll..."
                value={form.customUnit}
                onChange={e => handleChange('customUnit', e.target.value)}
                autoFocus
              />
              {errors.customUnit && <p className="text-[10px] text-red-400 mt-1">{errors.customUnit}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Total Nominal</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">Rp</span>
              <input type="text"
                className="input-field !pl-10 !bg-slate-100 dark:!bg-slate-900/50 !text-slate-500 cursor-not-allowed font-semibold border-dashed"
                value={totalAmount ? totalAmount.toLocaleString('id-ID') : '0'}
                disabled />
            </div>
            <p className="text-[10px] text-blue-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-blue-500"></span> Total otomatis dihitung dari rincian biaya.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Uraian</label>
            <textarea className="input-field resize-none" rows={3}
              placeholder="Keterangan pengeluaran (opsional)..."
              value={form.description} onChange={e => handleChange('description', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Petugas</label>
            <input type="text" className="input-field opacity-60" value={profile?.full_name || tx?.creator?.full_name || ''} disabled />
          </div>
        </div>

        {/* Receipt Card */}
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            Foto Nota <span className="text-slate-400 font-normal">(Opsional)</span>
          </label>
          <ReceiptUploader
            value={receiptFile}
            initialUrl={initialReceiptUrl}
            onChange={(file) => setReceiptFile(file)}
          />
        </div>

        <button type="submit" className="btn btn-primary w-full btn-lg" disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner size={16} /> : <Save size={16} />}
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>

      <ManageEventsModal
        isOpen={showManageEvents}
        onClose={() => setShowManageEvents(false)}
        onSelect={(name) => handleChange('source', name)}
      />

      <ManageCategoriesModal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        onSelect={(id) => handleChange('category_id', id)}
      />
    </div>
  )
}

export default ExpenseEdit
