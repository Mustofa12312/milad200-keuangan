import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Edit2, Check, Tags, Power } from 'lucide-react'
import { categoryService } from '@/services/categories'
import { useAuth } from '@/contexts/auth'
import { Spinner, ConfirmDialog } from '@/components/ui'
import toast from 'react-hot-toast'

const ManageCategoriesModal = ({ isOpen, onClose, onSelect }) => {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingDesc, setEditingDesc] = useState('')
  const [toggleTarget, setToggleTarget] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', showInactive],
    queryFn: () => categoryService.getCategories(showInactive),
    enabled: isOpen,
  })

  const createMutation = useMutation({
    mutationFn: (data) => categoryService.createCategory(data, user?.id),
    onSuccess: (created) => {
      toast.success(`Kategori "${created.name}" berhasil dibuat!`)
      qc.invalidateQueries({ queryKey: ['categories'] })
      setNewName('')
      setNewDesc('')
      if (onSelect) onSelect(created.id)
    },
    onError: (err) => toast.error(err.message || 'Gagal membuat kategori'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => categoryService.updateCategory(id, updates, user?.id),
    onSuccess: (updated) => {
      toast.success(`Kategori diperbarui menjadi "${updated.name}"!`)
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEditingId(null)
      setEditingName('')
      setEditingDesc('')
    },
    onError: (err) => toast.error(err.message || 'Gagal memperbarui kategori'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => categoryService.toggleActive(id, is_active, user?.id),
    onSuccess: () => {
      toast.success(toggleTarget?.is_active ? 'Kategori diaktifkan' : 'Kategori dinonaktifkan')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setToggleTarget(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal mengubah status kategori'),
  })

  if (!isOpen) return null

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    createMutation.mutate({ name: newName.trim(), description: newDesc.trim() })
  }

  const handleStartEdit = (cat) => {
    setEditingId(cat.id)
    setEditingName(cat.name)
    setEditingDesc(cat.description || '')
  }

  const handleSaveEdit = (cat) => {
    if (!editingName.trim()) return
    updateMutation.mutate({
      id: cat.id,
      updates: { name: editingName.trim(), description: editingDesc.trim() },
    })
  }

  const activeCategories = categories.filter((c) => c.is_active)
  const inactiveCategories = categories.filter((c) => !c.is_active)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Tags size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Kelola Kategori Biaya
              </h2>
              <p className="text-[11px] text-slate-500">
                Tambah atau sesuaikan jenis pos belanja pengeluaran
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Add form */}
          {isAdmin && (
            <form onSubmit={handleAdd} className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Tambah Kategori Baru</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field !py-1.5 !text-xs flex-1"
                  placeholder="Nama kategori (misal: Kebersihan, Konsumsi)..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={createMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={!newName.trim() || createMutation.isPending}
                  className="btn btn-primary btn-sm flex-shrink-0"
                >
                  {createMutation.isPending ? <Spinner size={13} color="white" /> : <Plus size={13} />}
                  Tambah
                </button>
              </div>
              <input
                type="text"
                className="input-field !py-1.5 !text-xs w-full"
                placeholder="Deskripsi/keterangan (opsional)..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                disabled={createMutation.isPending}
              />
            </form>
          )}

          {/* Categories List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Kategori Biaya Aktif ({activeCategories.length})
              </p>
              <button
                type="button"
                className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium"
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? 'Sembunyikan' : 'Lihat'} Nonaktif ({inactiveCategories.length})
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Spinner size={20} />
              </div>
            ) : activeCategories.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">Belum ada kategori aktif.</p>
            ) : (
              activeCategories.map((cat) => {
                const isEditing = editingId === cat.id
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-500/30 transition-colors group"
                  >
                    {isEditing ? (
                      <div className="space-y-1.5 flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="input-field !py-1 !text-xs flex-1"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            autoFocus
                            placeholder="Nama kategori"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(cat)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat)}
                            disabled={!editingName.trim() || updateMutation.isPending}
                            className="btn btn-success btn-xs"
                            title="Simpan"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn btn-ghost btn-xs text-slate-400"
                            title="Batal"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <input
                          type="text"
                          className="input-field !py-1 !text-[11px] w-full"
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          placeholder="Deskripsi kategori..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(cat)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (onSelect) {
                            onSelect(cat.id)
                            onClose()
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {cat.name}
                          </span>
                          {onSelect && (
                            <span className="text-[10px] text-blue-500 font-normal">
                              (klik untuk pilih)
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    )}

                    {!isEditing && isAdmin && (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity ml-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="btn btn-ghost btn-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          title="Edit kategori"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToggleTarget({ id: cat.id, is_active: false, name: cat.name })}
                          className="btn btn-ghost btn-xs text-amber-500 hover:text-amber-600"
                          title="Nonaktifkan kategori"
                        >
                          <Power size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Inactive categories list */}
            {showInactive && inactiveCategories.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Kategori Nonaktif ({inactiveCategories.length})
                </p>
                {inactiveCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-white/5 opacity-60 bg-slate-100/50 dark:bg-slate-800/20"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-slate-500 line-through truncate block">
                        {cat.name}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setToggleTarget({ id: cat.id, is_active: true, name: cat.name })}
                        className="btn btn-ghost btn-xs text-emerald-500 hover:text-emerald-600"
                        title="Aktifkan kembali"
                      >
                        <Power size={11} /> Aktifkan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button onClick={onClose} className="btn btn-ghost btn-xs">
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Aktifkan Kategori?' : 'Nonaktifkan Kategori?'}
        message={
          toggleTarget?.is_active
            ? `Kategori "${toggleTarget?.name}" akan diaktifkan kembali dan muncul di pilihan pengeluaran.`
            : `Kategori "${toggleTarget?.name}" akan dinonaktifkan dari pilihan pengeluaran baru. Transaksi lama tidak terpengaruh.`
        }
        confirmText={toggleTarget?.is_active ? 'Aktifkan' : 'Nonaktifkan'}
        confirmColor={toggleTarget?.is_active ? 'emerald' : 'amber'}
        onConfirm={() => toggleMutation.mutate({ id: toggleTarget.id, is_active: toggleTarget.is_active })}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  )
}

export default ManageCategoriesModal

