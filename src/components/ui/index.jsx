// Stat card for dashboard
export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, loading }) => {
  const colorMap = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400',
    green: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400',
    violet: 'from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400',
  }
  const iconBg = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/20 text-red-400',
    amber: 'bg-amber-500/20 text-amber-400',
    violet: 'bg-violet-500/20 text-violet-400',
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 border border-white/5">
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-7 w-36 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    )
  }

  return (
    <div className={`glass rounded-xl p-5 border bg-gradient-to-br ${colorMap[color]} animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-xl font-bold text-slate-100 currency leading-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
              <span className="text-slate-500">dari bulan lalu</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${iconBg[color]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  )
}

// Generic card wrapper
export const Card = ({ children, className = '', title, actions }) => (
  <div className={`glass rounded-xl border border-white/5 ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        {title && <h3 className="text-sm font-semibold text-slate-200">{title}</h3>}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
)

// Empty state
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && (
      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-500" />
      </div>
    )}
    <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
    {description && <p className="text-xs text-slate-500 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

// Loading spinner
export const Spinner = ({ size = 16 }) => (
  <svg
    className="animate-spin"
    style={{ width: size, height: size }}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

// Pagination
export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-slate-500">Halaman {page} dari {totalPages}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-ghost btn-sm"
        >
          ←
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p
          if (totalPages <= 5) {
            p = i + 1
          } else if (page <= 3) {
            p = i + 1
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i
          } else {
            p = page - 2 + i
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-ghost btn-sm"
        >
          →
        </button>
      </div>
    </div>
  )
}

// Badge
export const Badge = ({ label, type }) => {
  const cls = {
    INCOME: 'badge-income',
    EXPENSE: 'badge-expense',
    LUNAS: 'badge-paid',
    SEBAGIAN: 'badge-partial',
    'BELUM LUNAS': 'badge-unpaid',
  }
  return <span className={`badge ${cls[type] || 'badge-debt'}`}>{label}</span>
}

// Confirm Dialog
export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, loading, danger = false }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className="glass border border-white/10 rounded-xl w-full max-w-sm mx-4 p-6 animate-fade-in">
        <h3 className="text-base font-semibold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Batal</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  )
}
