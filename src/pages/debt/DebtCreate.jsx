import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { debtService } from '@/services/debts'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const DebtCreate = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    party_name: '',
    original_amount: '',
    debt_date: new Date().toISOString().split('T')[0],
    due_date: '',
    description: '',
  })
  const [errors, setErrors] = useState({})

  const mutation = useMutation({
    mutationFn: (data) => debtService.createDebt(data, user.id),
    onSuccess: () => {
      toast.success('Hutang berhasil dicatat!')
      qc.invalidateQueries({ queryKey: ['debts'] })
      qc.invalidateQueries({ queryKey: ['debt-summary'] })
      navigate('/debt')
    },
    onError: (err) => toast.error(err.message || 'Gagal menyimpan hutang'),
  })

  const validate = () => {
    const e = {}
    if (!form.party_name.trim()) e.party_name = 'Nama pihak wajib diisi'
    if (!form.original_amount || Number(form.original_amount) <= 0) e.original_amount = 'Nominal hutang harus lebih dari 0'
    if (!form.debt_date) e.debt_date = 'Tanggal hutang wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      party_name: form.party_name.trim(),
      original_amount: Number(form.original_amount),
      debt_date: form.debt_date,
      due_date: form.due_date || null,
      description: form.description.trim() || null,
    })
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /></button>
        <div>
          <h1 className="text-lg font-bold font-display text-slate-100">Tambah Hutang</h1>
          <p className="text-xs text-slate-500">Catat hutang organisasi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass rounded-xl border border-white/5 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nama Pihak / Kreditur *</label>
            <input type="text" className={`input-field ${errors.party_name ? 'border-red-500/50' : ''}`}
              placeholder="Nama orang/perusahaan yang memberi hutang"
              value={form.party_name} onChange={e => setForm(p => ({ ...p, party_name: e.target.value }))} />
            {errors.party_name && <p className="text-xs text-red-400 mt-1">{errors.party_name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nominal Hutang (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
              <input type="text" inputMode="numeric"
                className={`input-field pl-9 currency ${errors.original_amount ? 'border-red-500/50' : ''}`}
                placeholder="0"
                value={form.original_amount ? Number(form.original_amount).toLocaleString('id-ID') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '')
                  setForm(p => ({ ...p, original_amount: raw }))
                }} />
            </div>
            {errors.original_amount && <p className="text-xs text-red-400 mt-1">{errors.original_amount}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tanggal Hutang *</label>
              <input type="date" className={`input-field ${errors.debt_date ? 'border-red-500/50' : ''}`}
                value={form.debt_date} onChange={e => setForm(p => ({ ...p, debt_date: e.target.value }))} />
              {errors.debt_date && <p className="text-xs text-red-400 mt-1">{errors.debt_date}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Jatuh Tempo</label>
              <input type="date" className="input-field"
                value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Keterangan</label>
            <textarea className="input-field resize-none" rows={3}
              placeholder="Keterangan hutang (opsional)..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>

        <button type="submit" className="btn w-full btn-lg" disabled={mutation.isPending}
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>
          {mutation.isPending ? <Spinner size={16} /> : <Save size={16} />}
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Hutang'}
        </button>
      </form>
    </div>
  )
}

export default DebtCreate
