import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Save, Calculator, AlertCircle } from 'lucide-react'
import { budgetService } from '@/services/budget'
import { eventService } from '@/services/events'
import { useAuth } from '@/contexts/auth'
import { Spinner } from '@/components/ui'
import { formatCurrency } from '@/utils/format'
import toast from 'react-hot-toast'

const ManageBudgetsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const qc = useQueryClient()

  const [budgetInputs, setBudgetInputs] = useState(null)

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventService.getEvents,
    enabled: isOpen,
  })

  const { data: rawBudgets = {}, isLoading: budgetsLoading } = useQuery({
    queryKey: ['raw-budgets'],
    queryFn: () => budgetService.getBudgets(),
    enabled: isOpen,
  })

  const currentInputs = budgetInputs ?? rawBudgets ?? {}

  const mutation = useMutation({
    mutationFn: (newBudgets) => budgetService.saveAllBudgets(newBudgets, user?.id),
    onSuccess: () => {
      toast.success('Pagu anggaran RAB berhasil disimpan!')
      qc.invalidateQueries({ queryKey: ['budget-summary'] })
      qc.invalidateQueries({ queryKey: ['raw-budgets'] })
      setBudgetInputs(null)
      onClose()
    },
    onError: (err) => toast.error(err.message || 'Gagal menyimpan pagu anggaran'),
  })

  if (!isOpen) return null

  const handleInputChange = (eventName, val) => {
    const rawNumber = val.replace(/\D/g, '')
    setBudgetInputs((prev) => ({
      ...(prev ?? rawBudgets ?? {}),
      [eventName]: rawNumber ? Number(rawNumber) : 0,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(currentInputs)
  }

  const totalPagu = Object.values(currentInputs).reduce((sum, n) => sum + (Number(n) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Calculator size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Atur Pagu Anggaran (RAB)
              </h2>
              <p className="text-[11px] text-slate-500">
                Tentukan batas maksimal anggaran per pos kegiatan Milad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-900/30 flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
              <span>
                Masukkan nominal plafon dana yang disetujui. Sistem akan memantau serapan dan memberi peringatan otomatis jika pengeluaran mendekati atau melampaui pagu ini.
              </span>
            </div>

            {eventsLoading || budgetsLoading ? (
              <div className="py-12 flex justify-center">
                <Spinner size={24} />
              </div>
            ) : events.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">Belum ada pos acara.</p>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => {
                  const val = currentInputs[ev.name] || ''
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ev.name}
                        </label>
                        {val > 0 && (
                          <span className="text-[10px] text-blue-500 font-medium">
                            {formatCurrency(val)}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="input-field !py-1.5 !pl-9 !text-xs"
                          placeholder="0 (Belum ada anggaran)"
                          value={val ? Number(val).toLocaleString('id-ID') : ''}
                          onChange={(e) => handleInputChange(ev.name, e.target.value)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer with Total and Save button */}
          <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-slate-400">Total Plafon Anggaran (RAB):</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalPagu)}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
                Batal
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn btn-primary btn-sm"
              >
                {mutation.isPending ? <Spinner size={14} color="white" /> : <Save size={14} />}
                Simpan RAB
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ManageBudgetsModal
