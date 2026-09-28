import { useState } from 'react'
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react'

/**
 * Reusable filter bar with search, date range, and custom filter slots
 */
const FilterBar = ({
  search,
  onSearch,
  startDate,
  onStartDate,
  endDate,
  onEndDate,
  onReset,
  filterCount = 0,
  children, // additional filter controls
}) => {
  const [open, setOpen] = useState(false)

  const hasActiveFilters = startDate || endDate || filterCount > 0

  return (
    <div className="glass rounded-xl border border-white/5 p-4 space-y-3">
      {/* Search + toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            className="input-field pl-9 pr-8"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className={`btn btn-sm flex-shrink-0 relative ${open || hasActiveFilters ? 'btn-primary' : 'btn-ghost'}`}
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">Filter</span>
          {hasActiveFilters && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {filterCount + (startDate ? 1 : 0) + (endDate ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Expandable filter panel */}
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-white/5 animate-fade-in">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              Dari Tanggal
            </label>
            <input
              type="date"
              className="input-field text-sm"
              value={startDate}
              onChange={e => onStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              Sampai Tanggal
            </label>
            <input
              type="date"
              className="input-field text-sm"
              value={endDate}
              onChange={e => onEndDate(e.target.value)}
              min={startDate || undefined}
            />
          </div>

          {/* Slot for custom filters */}
          {children}

          {/* Reset button */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  onReset()
                  setOpen(false)
                }}
                className="btn btn-ghost btn-sm w-full text-red-400 hover:text-red-300"
              >
                <X size={13} /> Reset Semua
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active filter pills */}
      {hasActiveFilters && !open && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-500">Filter aktif:</span>
          {startDate && (
            <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              Dari: {startDate}
              <button onClick={() => onStartDate('')} className="hover:text-blue-200"><X size={9} /></button>
            </span>
          )}
          {endDate && (
            <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              S/d: {endDate}
              <button onClick={() => onEndDate('')} className="hover:text-blue-200"><X size={9} /></button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default FilterBar
