import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Power, Edit2, Shield, User as UserIcon, Plus, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { userService } from '@/services/users'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatRelative, getInitials } from '@/utils/format'
import { EmptyState, ConfirmDialog } from '@/components/ui'
import toast from 'react-hot-toast'

const UserList = () => {
  const { user: currentUser } = useAuth()
  const qc = useQueryClient()

  const [editUser, setEditUser] = useState(null)
  const [toggleTarget, setToggleTarget] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', role_id: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', password: '', full_name: '', role_id: '' })
  const [showAddPassword, setShowAddPassword] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: userService.getRoles,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => userService.updateUser(id, updates),
    onSuccess: () => {
      toast.success('User berhasil diperbarui!')
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal memperbarui user'),
  })

  const addMutation = useMutation({
    mutationFn: (data) => userService.createUser(data.email, data.password, { full_name: data.full_name, role_id: data.role_id }),
    onSuccess: () => {
      toast.success('Pengguna berhasil ditambahkan!')
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowAddModal(false)
      setAddForm({ email: '', password: '', full_name: '', role_id: '' })
    },
    onError: (err) => toast.error(err.message || 'Gagal menambahkan pengguna'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => userService.toggleActive(id, is_active),
    onSuccess: () => {
      toast.success(toggleTarget?.is_active ? 'User diaktifkan' : 'User dinonaktifkan')
      qc.invalidateQueries({ queryKey: ['users'] })
      setToggleTarget(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal'),
  })

  const startEdit = (u) => {
    setEditUser(u)
    setEditForm({ full_name: u.full_name || '', role_id: u.role_id || '' })
  }

  const handleUpdate = (e) => {
    e.preventDefault()
    updateMutation.mutate({ id: editUser.id, updates: editForm })
  }

  const handleAdd = (e) => {
    e.preventDefault()
    addMutation.mutate(addForm)
  }

  const activeUsers = users?.filter(u => u.is_active) || []
  const inactiveUsers = users?.filter(u => !u.is_active) || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-slate-100">Pengguna</h1>
          <p className="text-xs text-slate-500">Kelola pengguna sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
            {activeUsers.length} aktif
          </span>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>

      {/* Active users */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-slate-200">Pengguna Aktif</h3>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : activeUsers.length > 0 ? (
          <div className="divide-y divide-white/5">
            {activeUsers.map(u => (
              <div key={u.id} className="px-5 py-4 flex items-center gap-3 table-row-hover">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                  {getInitials(u.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{u.full_name || '-'}</p>
                    {u.user_id === currentUser?.id && (
                      <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full">Anda</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${u.roles?.name === 'ADMIN' ? 'bg-violet-500/15 text-violet-400' : 'bg-slate-700 text-slate-400'}`}>
                    {u.roles?.name === 'ADMIN' ? <Shield size={10} /> : <UserIcon size={10} />}
                    {u.roles?.name || 'USER'}
                  </div>
                  <button onClick={() => startEdit(u)} className="btn btn-ghost btn-xs"><Edit2 size={12} /></button>
                  {u.user_id !== currentUser?.id && (
                    <button
                      onClick={() => setToggleTarget({ id: u.id, is_active: false, name: u.full_name })}
                      className="btn btn-ghost btn-xs text-red-400"
                    >
                      <Power size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Users} title="Belum ada pengguna" />
        )}
      </div>

      {/* Inactive users */}
      {inactiveUsers.length > 0 && (
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-slate-400">Pengguna Nonaktif ({inactiveUsers.length})</h3>
          </div>
          <div className="divide-y divide-white/5">
            {inactiveUsers.map(u => (
              <div key={u.id} className="px-5 py-4 flex items-center gap-3 opacity-60">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-400">
                  {getInitials(u.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-400 line-through">{u.full_name || '-'}</p>
                  <p className="text-xs text-slate-600">{u.email}</p>
                </div>
                <button
                  onClick={() => setToggleTarget({ id: u.id, is_active: true, name: u.full_name })}
                  className="btn btn-ghost btn-xs text-emerald-400"
                >
                  <Power size={12} /> Aktifkan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="glass bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[1.5rem] w-full max-w-sm p-6 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold font-display text-slate-100 mb-6">Edit Pengguna</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">Nama Lengkap</label>
                <div className="relative group">
                  <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input type="text" required className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                    placeholder="Nama Pengguna"
                    value={editForm.full_name}
                    onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">Role</label>
                <div className="relative group">
                  <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
                  <select required className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none relative"
                    value={editForm.role_id}
                    onChange={e => setEditForm(p => ({ ...p, role_id: e.target.value }))}>
                    <option value="" className="bg-slate-900 text-slate-500">-- Pilih Role --</option>
                    {roles?.map(r => <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" className="w-full bg-transparent hover:bg-white/5 text-slate-300 font-medium py-2.5 px-4 rounded-xl border border-white/10 transition-all duration-200 active:scale-[0.98] flex-1" onClick={() => setEditUser(null)}>Batal</button>
                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] flex-1" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="glass bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[1.5rem] w-full max-w-sm p-6 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold font-display text-slate-100 mb-6">Tambah Pengguna</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">Email</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input type="email" required className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                    placeholder="email@panyeppen.com"
                    value={addForm.email}
                    onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input type={showAddPassword ? 'text' : 'password'} required minLength={6} className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                    value={addForm.password}
                    onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  >
                    {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">Nama Lengkap</label>
                <div className="relative group">
                  <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input type="text" required className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                    placeholder="Nama Pengguna"
                    value={addForm.full_name}
                    onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300 ml-1">Role</label>
                <div className="relative group">
                  <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
                  <select required className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none relative"
                    value={addForm.role_id}
                    onChange={e => setAddForm(p => ({ ...p, role_id: e.target.value }))}>
                    <option value="" className="bg-slate-900 text-slate-500">-- Pilih Role --</option>
                    {roles?.map(r => <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" className="w-full bg-transparent hover:bg-white/5 text-slate-300 font-medium py-2.5 px-4 rounded-xl border border-white/10 transition-all duration-200 active:scale-[0.98] flex-1" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] flex-1" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Aktifkan User?' : 'Nonaktifkan User?'}
        message={`User "${toggleTarget?.name}" akan ${toggleTarget?.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`}
        danger={!toggleTarget?.is_active}
        loading={toggleMutation.isPending}
        onConfirm={() => toggleMutation.mutate({ id: toggleTarget.id, is_active: toggleTarget.is_active })}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  )
}

export default UserList
