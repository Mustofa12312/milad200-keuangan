import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tags, Edit2, Power, Tag, Trash2, Check, X } from 'lucide-react'
import { categoryService } from '@/services/categories'
import { eventService } from '@/services/events'
import { useAuth } from '@/contexts/auth'
import { EmptyState, ConfirmDialog } from '@/components/ui'
import toast from 'react-hot-toast'

const CategoryList = () => {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState('categories') // 'categories' | 'events'

  // Category state
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState({})
  const [toggleTarget, setToggleTarget] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  // Pos Acara (events) state
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [editingEventId, setEditingEventId] = useState(null)
  const [editingEventName, setEditingEventName] = useState('')
  const [deleteEventTarget, setDeleteEventTarget] = useState(null)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', showInactive],
    queryFn: () => categoryService.getCategories(showInactive),
  })

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventService.getEvents,
  })

  // Category mutations
  const createMutation = useMutation({
    mutationFn: (data) => categoryService.createCategory(data, user.id),
    onSuccess: () => {
      toast.success('Kategori berhasil dibuat!')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setShowCreate(false)
      setForm({ name: '', description: '' })
    },
    onError: (err) => toast.error(err.message || 'Gagal membuat kategori'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => categoryService.updateCategory(id, updates, user.id),
    onSuccess: () => {
      toast.success('Kategori berhasil diperbarui!')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEditItem(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal memperbarui'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => categoryService.toggleActive(id, is_active, user.id),
    onSuccess: () => {
      toast.success(toggleTarget?.is_active ? 'Kategori diaktifkan' : 'Kategori dinonaktifkan')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setToggleTarget(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal'),
  })

  // Event mutations
  const createEventMutation = useMutation({
    mutationFn: (name) => eventService.createEvent(name, user?.id),
    onSuccess: (created) => {
      toast.success(`Pos acara "${created.name}" berhasil ditambahkan!`)
      qc.invalidateQueries({ queryKey: ['events'] })
      setShowCreateEvent(false)
      setNewEventName('')
    },
    onError: (err) => toast.error(err.message || 'Gagal menambahkan pos acara'),
  })

  const updateEventMutation = useMutation({
    mutationFn: ({ id, newName, oldName }) => eventService.updateEvent(id, newName, oldName, user?.id),
    onSuccess: (updated) => {
      toast.success(`Pos acara diperbarui menjadi "${updated.name}"!`)
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setEditingEventId(null)
      setEditingEventName('')
    },
    onError: (err) => toast.error(err.message || 'Gagal memperbarui pos acara'),
  })

  const deleteEventMutation = useMutation({
    mutationFn: (target) => eventService.deleteEvent(target.id, target.name, user?.id),
    onSuccess: (_, target) => {
      toast.success(`Pos acara "${target.name}" berhasil dihapus!`)
      qc.invalidateQueries({ queryKey: ['events'] })
      setDeleteEventTarget(null)
    },
    onError: (err) => toast.error(err.message || 'Gagal menghapus pos acara'),
  })

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nama kategori wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, updates: { name: form.name.trim(), description: form.description.trim() } })
    } else {
      createMutation.mutate({ name: form.name.trim(), description: form.description.trim() })
    }
  }

  const handleAddEvent = (e) => {
    e.preventDefault()
    if (!newEventName.trim()) return
    createEventMutation.mutate(newEventName.trim())
  }

  const startEdit = (cat) => {
    setEditItem(cat)
    setForm({ name: cat.name, description: cat.description || '' })
    setShowCreate(true)
  }

  const active = categories?.filter(c => c.is_active) || []
  const inactive = categories?.filter(c => !c.is_active) || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">
            {activeTab === 'categories' ? 'Kategori Biaya' : 'Pos Acara / Kegiatan'}
          </h1>
          <p className="text-xs text-slate-500">
            {activeTab === 'categories'
              ? 'Kelola jenis kategori pengeluaran (Konsumsi, ATK, Transportasi, dll.)'
              : 'Kelola sub-kegiatan dan pos acara dalam Milad (Lomba, Bahsul Masail, Haul, dll.)'}
          </p>
        </div>
        {isAdmin && (
          activeTab === 'categories' ? (
            <button
              onClick={() => { setShowCreate(true); setEditItem(null); setForm({ name: '', description: '' }) }}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> Tambah Kategori
            </button>
          ) : (
            <button
              onClick={() => setShowCreateEvent(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> Tambah Pos Acara
            </button>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'categories'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Tags size={15} /> Kategori Biaya ({active.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'events'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Tag size={15} /> Pos Acara / Kegiatan ({events.length})
        </button>
      </div>

      {activeTab === 'categories' ? (
        <>
          {/* Active categories */}
          <div className="glass rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kategori Aktif ({active.length})</h3>
              <button
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors"
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? 'Sembunyikan' : 'Tampilkan'} nonaktif
              </button>
            </div>

            {isLoading ? (
              <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
            ) : active.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-white/5">
                {active.map(cat => (
                  <div key={cat.id} className="px-5 py-3.5 flex items-center gap-3 table-row-hover">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                      <Tags size={15} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{cat.name}</p>
                      {cat.description && <p className="text-xs text-slate-500">{cat.description}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(cat)} className="btn btn-ghost btn-xs"><Edit2 size={12} /></button>
                        <button
                          onClick={() => setToggleTarget({ id: cat.id, is_active: false, name: cat.name })}
                          className="btn btn-ghost btn-xs text-amber-400"
                          title="Nonaktifkan"
                        >
                          <Power size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10">
                <EmptyState icon={Tags} title="Belum ada kategori" description="Buat kategori pengeluaran pertama" />
              </div>
            )}
          </div>

          {/* Inactive categories */}
          {showInactive && inactive.length > 0 && (
            <div className="glass rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Kategori Nonaktif ({inactive.length})</h3>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/5">
                {inactive.map(cat => (
                  <div key={cat.id} className="px-5 py-3.5 flex items-center gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Tags size={15} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-through">{cat.name}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setToggleTarget({ id: cat.id, is_active: true, name: cat.name })}
                        className="btn btn-ghost btn-xs text-emerald-400"
                        title="Aktifkan"
                      >
                        <Power size={12} /> Aktifkan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Pos Acara Tab */
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Daftar Pos Acara / Sub-Kegiatan ({events.length})
            </h3>
          </div>

          {eventsLoading ? (
            <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
          ) : events.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-white/5">
              {events.map(ev => {
                const isEditing = editingEventId === ev.id
                return (
                  <div key={ev.id} className="px-5 py-3.5 flex items-center justify-between gap-3 table-row-hover group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                        <Tag size={15} className="text-indigo-400" />
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                          <input
                            type="text"
                            className="input-field !py-1 !text-xs flex-1"
                            value={editingEventName}
                            onChange={(e) => setEditingEventName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (!editingEventName.trim()) return
                                updateEventMutation.mutate({ id: ev.id, newName: editingEventName.trim(), oldName: ev.name })
                              }
                              if (e.key === 'Escape') setEditingEventId(null)
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingEventName.trim()) return
                              updateEventMutation.mutate({ id: ev.id, newName: editingEventName.trim(), oldName: ev.name })
                            }}
                            disabled={!editingEventName.trim() || updateEventMutation.isPending}
                            className="btn btn-success btn-xs"
                            title="Simpan"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEventId(null)}
                            className="btn btn-ghost btn-xs text-slate-400"
                            title="Batal"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ev.name}</p>
                          <p className="text-[11px] text-slate-400">Sub-kegiatan dalam Milad</p>
                        </div>
                      )}
                    </div>

                    {!isEditing && isAdmin && (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingEventId(ev.id)
                            setEditingEventName(ev.name)
                          }}
                          className="btn btn-ghost btn-xs"
                          title="Edit nama"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteEventTarget(ev)}
                          className="btn btn-ghost btn-xs text-red-400 hover:text-red-300"
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-10">
              <EmptyState icon={Tag} title="Belum ada pos acara" description="Tambahkan pos kegiatan pertama untuk acara Milad" />
            </div>
          )}
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="glass border border-slate-300 dark:border-white/10 rounded-xl w-full max-w-sm p-5 animate-fade-in">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {editItem ? 'Edit Kategori' : 'Tambah Kategori'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Nama Kategori *</label>
                <input type="text" className={`input-field ${errors.name ? 'border-red-500/50' : ''}`}
                  placeholder="Contoh: Konsumsi, Transportasi..."
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Deskripsi</label>
                <input type="text" className="input-field" placeholder="Opsional"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-ghost flex-1"
                  onClick={() => { setShowCreate(false); setEditItem(null) }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? 'Menyimpan...' : (editItem ? 'Simpan' : 'Buat')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pos Acara Create Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4">
          <div className="glass border border-slate-300 dark:border-white/10 rounded-xl w-full max-w-sm p-5 animate-fade-in bg-white dark:bg-slate-900 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Tambah Pos Acara / Kegiatan
            </h3>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Nama Pos Acara *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Contoh: Lomba Santri, Khotmil Quran..."
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => { setShowCreateEvent(false); setNewEventName('') }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={!newEventName.trim() || createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? 'Menyimpan...' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Toggle confirm */}
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Aktifkan Kategori?' : 'Nonaktifkan Kategori?'}
        message={toggleTarget?.is_active
          ? `Kategori "${toggleTarget?.name}" akan diaktifkan kembali.`
          : `Kategori "${toggleTarget?.name}" akan dinonaktifkan. Transaksi lama tetap valid.`}
        danger={!toggleTarget?.is_active}
        loading={toggleMutation.isPending}
        onConfirm={() => toggleMutation.mutate({ id: toggleTarget.id, is_active: toggleTarget.is_active })}
        onCancel={() => setToggleTarget(null)}
      />

      {/* Event Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteEventTarget)}
        title="Hapus Pos Acara?"
        message={`Apakah Anda yakin ingin menghapus pos acara "${deleteEventTarget?.name}"? Transaksi yang sudah menggunakan pos acara ini tidak akan terhapus, namun tidak akan muncul lagi di pilihan.`}
        danger
        loading={deleteEventMutation.isPending}
        onConfirm={() => deleteEventTarget && deleteEventMutation.mutate(deleteEventTarget)}
        onCancel={() => setDeleteEventTarget(null)}
      />
    </div>
  )
}

export default CategoryList
