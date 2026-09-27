import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, User, Search, Filter } from 'lucide-react'
import { auditService } from '@/services/auditLog'
import { userService } from '@/services/users'
import { formatDateTime, formatRelative, getInitials } from '@/utils/format'
import { EmptyState, Pagination } from '@/components/ui'

const ACTION_LABELS = {
  CREATE: { label: 'Membuat', color: 'text-emerald-400 bg-emerald-400/10' },
  UPDATE: { label: 'Mengubah', color: 'text-blue-400 bg-blue-400/10' },
  DELETE: { label: 'Membatalkan', color: 'text-red-400 bg-red-400/10' },
  LOGIN: { label: 'Login', color: 'text-violet-400 bg-violet-400/10' },
  LOGOUT: { label: 'Logout', color: 'text-slate-400 bg-slate-400/10' },
  PAYMENT: { label: 'Pembayaran', color: 'text-amber-400 bg-amber-400/10' },
  ACTIVATE: { label: 'Mengaktifkan', color: 'text-emerald-400 bg-emerald-400/10' },
  DEACTIVATE: { label: 'Menonaktifkan', color: 'text-red-400 bg-red-400/10' },
}

const ENTITY_LABELS = {
  transaction: 'Transaksi',
  category: 'Kategori',
  debt: 'Hutang',
  auth: 'Login',
  user: 'Pengguna',
}

const AuditLog = () => {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, entityFilter, userFilter],
    queryFn: () => auditService.getLogs({
      page,
      pageSize: 25,
      action: actionFilter || undefined,
      entity_type: entityFilter || undefined,
      user_id: userFilter || undefined,
    }),
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold font-display text-slate-100">Audit Log</h1>
        <p className="text-xs text-slate-500">Riwayat aktivitas seluruh pengguna</p>
      </div>

      {/* Info */}
      <div className="glass rounded-xl border border-amber-500/20 p-4 bg-amber-500/5">
        <p className="text-xs text-amber-400">
          🔒 Audit log tidak dapat diedit atau dihapus. Setiap aktivitas penting dicatat secara otomatis.
        </p>
      </div>

      {/* Filter */}
      <div className="glass rounded-xl border border-white/5 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Aksi</label>
            <select className="input-field" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}>
              <option value="">Semua Aksi</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Entitas</label>
            <select className="input-field" value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1) }}>
              <option value="">Semua</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Pengguna</label>
            <select className="input-field" value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1) }}>
              <option value="">Semua Pengguna</option>
              {users?.map(u => <option key={u.id} value={u.user_id}>{u.full_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Log list */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : data?.data?.length > 0 ? (
          <>
            <div className="divide-y divide-white/5">
              {data.data.map(log => {
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'text-slate-400 bg-slate-400/10' }
                return (
                  <div key={log.id} className="px-5 py-4 flex items-start gap-3 table-row-hover">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-600/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-300">
                      {getInitials(log.user?.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-slate-200">{log.user?.full_name || 'System'}</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                        {log.entity_type && (
                          <span className="text-xs text-slate-500">
                            {ENTITY_LABELS[log.entity_type] || log.entity_type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                      {(log.old_data || log.new_data) && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-800/50 text-[11px]">
                          {log.old_data?.amount && log.new_data?.amount && (
                            <span className="text-slate-400">
                              Nominal: <span className="text-red-400 line-through">{Number(log.old_data.amount).toLocaleString('id-ID')}</span>
                              {' → '}
                              <span className="text-emerald-400">{Number(log.new_data.amount).toLocaleString('id-ID')}</span>
                            </span>
                          )}
                          {log.new_data?.name && (
                            <span className="text-slate-400">Nama: <span className="text-slate-200">{log.new_data.name}</span></span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-600 flex-shrink-0">{formatRelative(log.created_at)}</span>
                  </div>
                )
              })}
            </div>
            <div className="px-5 pb-4">
              <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <div className="py-12">
            <EmptyState icon={ClipboardList} title="Belum ada aktivitas" description="Log aktivitas akan muncul di sini" />
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditLog
