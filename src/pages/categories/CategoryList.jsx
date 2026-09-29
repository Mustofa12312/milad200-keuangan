import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tags, Edit2, Power } from 'lucide-react'
import { categoryService } from '@/services/categories'
import { useAuth } from '@/contexts/AuthContext'
import { EmptyState, ConfirmDialog } from '@/components/ui'
import toast from 'react-hot-toast'

const CategoryList = () => {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState({})
  const [toggleTarget, setToggleTarget] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', showInactive],
    queryFn: () => categoryService.getCategories(showInactive),
  })

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
          <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">Kategori</h1>
          <p className="text-xs text-slate-500">Kelola kategori pengeluaran</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowCreate(true); setEditItem(null); setForm({ name: '', description: '' }) }}
            className="btn btn-primary btn-sm">
            <Plus size={14} /> Tambah Kategori
          </button>
        )}
      </div>

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

      {/* Create/Edit Modal */}
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

      {/* Toggle confirm */}
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
    </div>
  )
}

export default CategoryList
