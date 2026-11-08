import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import { budgetService } from '@/services/budget'
import { formatCurrency } from '@/utils/format'

const EventBudgetAlert = ({ eventName, currentAmount = 0, initialAmount = 0 }) => {
  const { data: budgetData } = useQuery({
    queryKey: ['budget-summary'],
    queryFn: () => budgetService.getBudgetSummary(),
    staleTime: 15000,
  })

  if (!eventName || eventName === 'Lainnya') return null

  const item = budgetData?.items?.find((i) => i.name === eventName)
  if (!item || !item.budget || item.budget <= 0) return null

  const amountNum = Number(currentAmount) || 0
  const initNum = Number(initialAmount) || 0
  const projectedSpent = Math.max(0, item.spent - initNum + amountNum)
  const projectedRemaining = item.budget - projectedSpent
  const projectedPercent = item.budget > 0 ? (projectedSpent / item.budget) * 100 : 0
  const isOverBudget = projectedSpent > item.budget
  const isNearBudget = projectedPercent >= 75 && !isOverBudget

  return (
    <div className="mt-2.5 space-y-2 animate-fade-in">
      {/* Current budget status info box */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <TrendingUp size={13} className="text-blue-500" />
            Status Anggaran: <span className="text-blue-500 font-bold">{eventName}</span>
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            item.status === 'OVER'
              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
              : item.status === 'WARNING'
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
          }`}>
            {item.percent.toFixed(1)}% Terpakai
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              item.status === 'OVER'
                ? 'bg-red-500'
                : item.status === 'WARNING'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(item.percent, 100)}%` }}
          />
        </div>

        {/* Numbers summary */}
        <div className="grid grid-cols-3 gap-2 text-[10px] pt-0.5 text-slate-500">
          <div>
            <span className="block text-slate-400">Pagu:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {formatCurrency(item.budget)}
            </span>
          </div>
          <div>
            <span className="block text-slate-400">Realisasi:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {formatCurrency(item.spent)}
            </span>
          </div>
          <div>
            <span className="block text-slate-400">Sisa:</span>
            <span className={`font-semibold ${item.remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {formatCurrency(item.remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Overrun Warning when current expense amount causes an overrun */}
      {amountNum > 0 && isOverBudget && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <p className="font-bold">Peringatan: Melebihi Plafon Anggaran (Over-Budget)</p>
            <p className="text-[11px] mt-0.5 text-red-600 dark:text-red-400">
              Nominal pengeluaran ini ({formatCurrency(amountNum)}) akan membuat total belanja untuk{' '}
              <strong>{eventName}</strong> menjadi <strong>{formatCurrency(projectedSpent)}</strong>, melebihi pagu anggaran sebesar{' '}
              <span className="font-bold underline text-red-600 dark:text-red-400">
                {formatCurrency(Math.abs(projectedRemaining))}
              </span>.
            </p>
          </div>
        </div>
      )}

      {/* Warning when getting near the budget (> 75%) */}
      {amountNum > 0 && isNearBudget && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <p className="font-bold">Mendekati Batas Anggaran ({projectedPercent.toFixed(1)}%)</p>
            <p className="text-[11px] mt-0.5 text-amber-600 dark:text-amber-400">
              Setelah pengeluaran ini, sisa anggaran untuk <strong>{eventName}</strong> tersisa{' '}
              <strong>{formatCurrency(projectedRemaining)}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Safe feedback when well within budget */}
      {amountNum > 0 && !isOverBudget && !isNearBudget && (
        <div className="p-2 px-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
          <span>
            Anggaran aman. Sisa setelah transaksi ini: <strong>{formatCurrency(projectedRemaining)}</strong>.
          </span>
        </div>
      )}
    </div>
  )
}

export default EventBudgetAlert
