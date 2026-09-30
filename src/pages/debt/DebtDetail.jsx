import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { debtService } from '@/services/debts'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatRelative, getStatusLabel } from '@/utils/format'
import { Spinner, ConfirmDialog } from '@/components/ui'
import toast from 'react-hot-toast'

const statusIcon = { 'LUNAS': CheckCircle, 'SEBAGIAN': Clock, 'BELUM LUNAS': AlertCircle }
const statusColor = {
  'LUNAS': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'SEBAGIAN': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'BELUM LUNAS': 'text-red-400 bg-red-400/10 border-red-400/20',
}

const DebtDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], description: '' })
  const [payErrors, setPayErrors] = useState({})

  const { data: debt, isLoading } = useQuery({
    queryKey: ['debt', id],
    queryFn: () => debtService.getDebtById(id),
  })

  const payMutation = useMutation({
    mutationFn: (data) => debtService.addPayment(id, data, user.id),
    onSuccess: () => {
      toast.success('Pembayaran berhasil dicatat!')
      qc.invalidateQueries({ queryKey: ['debt', id] })
      qc.invalidateQueries({ queryKey: ['debts'] })
      qc.invalidateQueries({ queryKey: ['debt-summary'] })
      setShowPayModal(false)
      setPayForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], description: '' })
    },
    onError: (err) => toast.error(err.message || 'Gagal mencatat pembayaran'),
  })

  const validatePay = () => {
    const e = {}
    if (!payForm.amount || Number(payForm.amount) <= 0) e.amount = 'Nominal harus lebih dari 0'
    if (debt && Number(payForm.amount) > Number(debt.remaining_amount)) {
      e.amount = `Pembayaran tidak boleh melebihi sisa hutang (${formatCurrency(debt.remaining_amount)})`
    }
    if (!payForm.payment_date) e.payment_date = 'Tanggal wajib diisi'
    setPayErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePay = (e) => {
    e.preventDefault()
    if (!validatePay()) return
    payMutation.mutate({
      amount: Number(payForm.amount),
      payment_date: payForm.payment_date,
      description: payForm.description.trim() || null,
    })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={24} /></div>
  if (!debt) return <div className="text-center py-20 text-slate-500">Hutang tidak ditemukan</div>

  const paidPct = Math.round(((debt.original_amount - debt.remaining_amount) / debt.original_amount) * 100)
  const StatusIcon = statusIcon[debt.status] || AlertCircle

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /></button>
        <div>
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">{debt.party_name}</h1>
          <p className="text-xs text-slate-500">Detail hutang organisasi</p>
        </div>
      </div>

      {/* Main info */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${statusColor[debt.status]}`}>
            <StatusIcon size={13} />
            {getStatusLabel(debt.status)}
          </div>
          {debt.due_date && (
            <p className="text-xs text-slate-600 dark:text-slate-400">Jatuh tempo: <span className="text-slate-800 dark:text-slate-200">{formatDate(debt.due_date)}</span></p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Total Hutang</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 currency">{formatCurrency(debt.original_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Sisa Hutang</p>
            <p className="text-xl font-bold text-red-400 currency">{formatCurrency(debt.remaining_amount)}</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 dark:text-slate-400">Progress Pembayaran</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{paidPct}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>Terbayar: {formatCurrency(debt.original_amount - debt.remaining_amount)}</span>
            <span>Sisa: {formatCurrency(debt.remaining_amount)}</span>
          </div>
        </div>

        <div className="divider" />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-500">Tanggal Hutang</p>
            <p className="text-slate-800 dark:text-slate-200 font-medium">{formatDate(debt.debt_date)}</p>
          </div>
          <div>
            <p className="text-slate-500">Dicatat oleh</p>
            <p className="text-slate-800 dark:text-slate-200 font-medium">{debt.creator?.full_name || '-'}</p>
          </div>
        </div>

        {debt.description && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Keterangan</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{debt.description}</p>
          </div>
        )}

        {debt.status !== 'LUNAS' && (
          <button
            onClick={() => setShowPayModal(true)}
            className="btn w-full"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}
          >
            <Plus size={14} /> Catat Pembayaran
          </button>
        )}
      </div>

      {/* Payment history */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Riwayat Pembayaran</h3>
        </div>
        {debt.payments?.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {[...debt.payments].reverse().map(p => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 currency">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-slate-500">{formatDate(p.payment_date)} • {p.creator?.full_name}</p>
                  {p.description && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{p.description}</p>}
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle size={14} className="text-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">Belum ada pembayaran</p>
          </div>
        )}
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="glass border border-slate-300 dark:border-white/10 rounded-xl w-full max-w-sm p-5 animate-fade-in">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Catat Pembayaran</h3>
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Nominal Pembayaran *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 text-sm font-medium">Rp</span>
                  <input type="text" inputMode="numeric"
                    className={`input-field !pl-10 currency ${payErrors.amount ? 'border-red-500/50' : ''}`}
                    placeholder="0"
                    value={payForm.amount ? Number(payForm.amount).toLocaleString('id-ID') : ''}
                    onChange={e => setPayForm(p => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))} />
                </div>
                {payErrors.amount && <p className="text-xs text-red-400 mt-1">{payErrors.amount}</p>}
                <p className="text-xs text-slate-500 mt-1">Sisa hutang: {formatCurrency(debt.remaining_amount)}</p>
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Tanggal Bayar *</label>
                <input type="date" className={`input-field ${payErrors.payment_date ? 'border-red-500/50' : ''}`}
                  value={payForm.payment_date}
                  onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Keterangan</label>
                <input type="text" className="input-field" placeholder="Opsional"
                  value={payForm.description}
                  onChange={e => setPayForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="flex gap-3">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowPayModal(false)}>Batal</button>
                <button type="submit" className="btn flex-1" disabled={payMutation.isPending}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}>
                  {payMutation.isPending ? <Spinner size={14} /> : null}
                  {payMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DebtDetail
