import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Edit2, Trash2, Check, Tag } from 'lucide-react'
import { eventService } from '@/services/events'
import { useAuth } from '@/contexts/auth'
import { Spinner, ConfirmDialog } from '@/components/ui'
import toast from 'react-hot-toast'

const ManageEventsModal = ({ isOpen, onClose, onSelect }) => {
  const { user } = useAuth()
  const qc = useQueryClient()

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventService.getEvents,
    enabled: isOpen,
  })

  const createMutation = useMutation({
    mutationFn: (name) => eventService.createEvent(name, user?.id),
    onSuccess: (created) => {
      toast.success(`Pos acara "${created.name}" berhasil ditambahkan!`)
      qc.invalidateQueries({ queryKey: ['events'] })
      setNewName('')
      if (onSelect) onSelect(created.name)
    },
    onError: (err) => toast.error(err.message || 'Gagal menambahkan pos acara'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, newName, oldName }) => eventService.updateEvent(id, newName, oldName, user?.id),
    onSuccess: (updated) => {
      toast.success(`Pos acara diperbarui menjadi "${updated.name}"!`)
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setEditingId(null)
      setEditingName('')
    },
    onError: (err) => toast.error(err.message || 'Gagal memperbarui pos acara'),
  })

  const deleteMutation = useMutation({
    mutationFn: (target) => eventService.deleteEvent(target.id, target.name, user?.id),
    onSuccess: (_, target) => {
      toast.success(`Pos acara "${target.name}" berhasil dihapus!`)
      qc.invalidateQueries({ queryKey: ['events'] })
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal menghapus pos acara'),
  })

  if (!isOpen) return null

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    createMutation.mutate(newName.trim())
  }

  const handleStartEdit = (ev) => {
    setEditingId(ev.id)
    setEditingName(ev.name)
  }

  const handleSaveEdit = (ev) => {
    if (!editingName.trim()) return
    updateMutation.mutate({ id: ev.id, newName: editingName.trim(), oldName: ev.name })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Tag size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Kelola Pos Acara / Kegiatan
              </h2>
              <p className="text-[11px] text-slate-500">Tambah, ubah, atau hapus sub-kegiatan</p>
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
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              className="input-field !py-2 !text-xs flex-1"
              placeholder="Ketik nama pos acara baru..."
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
          </form>

          {/* Event list */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Daftar Pos Acara Aktif ({events.length})
            </p>

            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Spinner size={20} />
              </div>
            ) : events.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">Belum ada pos acara.</p>
            ) : (
              events.map((ev) => {
                const isEditing = editingId === ev.id
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-500/30 transition-colors group"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          className="input-field !py-1 !text-xs flex-1"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(ev)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(ev)}
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
                    ) : (
                      <>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {ev.name}
                        </span>
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(ev)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Edit nama"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(ev)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/10 flex justify-end">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Tutup
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Pos Acara?"
        message={`Apakah Anda yakin ingin menghapus pos acara "${deleteTarget?.name}"? Transaksi yang sudah menggunakan pos acara ini tidak akan terhapus, namun pos acara ini tidak akan muncul lagi di pilihan.`}
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ManageEventsModal
