import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User, Lock, LogOut, Shield, Save, Eye, EyeOff,
  Camera, CheckCircle, AlertCircle, Smartphone, Monitor,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth'
import supabase from '@/services/supabase'
import { getInitials, formatDateTime } from '@/utils/format'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Settings = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
  })
  const [profileLoading, setProfileLoading] = useState(false)

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({})

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profileForm.full_name.trim(), updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Profil berhasil diperbarui!')
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui profil')
    } finally {
      setProfileLoading(false)
    }
  }

  const validatePassword = () => {
    const e = {}
    if (!passwordForm.newPassword) e.newPassword = 'Password baru wajib diisi'
    else if (passwordForm.newPassword.length < 8) e.newPassword = 'Minimal 8 karakter'
    if (!passwordForm.confirmPassword) e.confirmPassword = 'Konfirmasi password wajib diisi'
    else if (passwordForm.newPassword !== passwordForm.confirmPassword) e.confirmPassword = 'Password tidak cocok'
    setPasswordErrors(e)
    return Object.keys(e).length === 0
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!validatePassword()) return
    setPasswordLoading(true)
    try {
      await authService.updatePassword(passwordForm.newPassword)
      toast.success('Password berhasil diperbarui!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const TABS = [
    { key: 'profile', label: 'Profil', icon: User },
    { key: 'security', label: 'Keamanan', icon: Lock },
    { key: 'about', label: 'Tentang', icon: Shield },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">Pengaturan</h1>
        <p className="text-xs text-slate-500">Kelola profil dan keamanan akun Anda</p>
      </div>

      {/* Profile banner */}
      <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-500/20">
              {getInitials(profile?.full_name)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{profile?.full_name || 'Pengguna'}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'}`}>
                {isAdmin ? '👑 Administrator' : '👤 Petugas'}
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                ● Aktif
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl border border-slate-200 dark:border-white/5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === key
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Informasi Profil</h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                className="input-field"
                value={profileForm.full_name}
                onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Nama lengkap Anda"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email</label>
              <input type="email" className="input-field opacity-60" value={user?.email || ''} disabled />
              <p className="text-[10px] text-slate-500 mt-1">Email tidak dapat diubah</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Role</label>
              <input
                type="text"
                className="input-field opacity-60"
                value={profile?.roles?.name || 'USER'}
                disabled
              />
              <p className="text-[10px] text-slate-500 mt-1">Role hanya dapat diubah oleh Admin</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Bergabung</label>
                <input
                  type="text"
                  className="input-field opacity-60"
                  value={formatDateTime(user?.created_at) || '-'}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Terakhir Login</label>
                <input
                  type="text"
                  className="input-field opacity-60"
                  value={formatDateTime(user?.last_sign_in_at) || '-'}
                  disabled
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={profileLoading}>
              {profileLoading ? <Spinner size={14} /> : <Save size={14} />}
              {profileLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4 animate-fade-in">
          {/* Change password */}
          <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Ubah Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {[
                { key: 'newPassword', label: 'Password Baru', show: showPasswords.new, toggleKey: 'new' },
                { key: 'confirmPassword', label: 'Konfirmasi Password Baru', show: showPasswords.confirm, toggleKey: 'confirm' },
              ].map(({ key, label, show, toggleKey }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={show ? 'text' : 'password'}
                      className={`input-field pl-9 pr-10 ${passwordErrors[key] ? 'border-red-500/50' : ''}`}
                      value={passwordForm[key]}
                      onChange={e => setPasswordForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors"
                      onClick={() => setShowPasswords(p => ({ ...p, [toggleKey]: !p[toggleKey] }))}
                    >
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {passwordErrors[key] && <p className="text-xs text-red-400 mt-1">{passwordErrors[key]}</p>}
                </div>
              ))}

              {/* Password strength */}
              {passwordForm.newPassword && (
                <div className="p-3 rounded-lg bg-slate-800/50 space-y-1.5">
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Kekuatan Password:</p>
                  {[
                    { label: 'Minimal 8 karakter', ok: passwordForm.newPassword.length >= 8 },
                    { label: 'Mengandung angka', ok: /\d/.test(passwordForm.newPassword) },
                    { label: 'Mengandung huruf kapital', ok: /[A-Z]/.test(passwordForm.newPassword) },
                    { label: 'Mengandung karakter khusus', ok: /[!@#$%^&*]/.test(passwordForm.newPassword) },
                  ].map(({ label, ok }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-[10px] ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {ok ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                      {label}
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full" disabled={passwordLoading}>
                {passwordLoading ? <Spinner size={14} /> : <Lock size={14} />}
                {passwordLoading ? 'Menyimpan...' : 'Ubah Password'}
              </button>
            </form>
          </div>

          {/* Danger zone */}
          <div className="glass rounded-xl border border-red-500/20 p-5 bg-red-500/5">
            <h3 className="text-sm font-semibold text-red-400 mb-3">Zona Berbahaya</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Keluar dari semua perangkat akan menghapus semua sesi aktif Anda.
            </p>
            <button onClick={handleSignOut} className="btn btn-danger btn-sm w-full">
              <LogOut size={14} /> Keluar dari Akun
            </button>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">KP</span>
              </div>
              <div>
                <h3 className="text-base font-bold gradient-text">Laporan Keuangan</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">200 Tahun Panyeppen</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Versi', value: '1.0.0 — Fase 2' },
                { label: 'Stack', value: 'Pengguna Lebih Dipermudah ' },
                { label: 'Deployment', value: 'Milad 200 Tahun' },
                { label: 'Database', value: 'Pondok Pesantren Panyeppen' },
                { label: 'Auth', value: 'Semua Panitia Milad' },
                { label: 'Storage', value: 'Pondok Pesantren Panyeppen' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/5 last:border-0">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl border border-slate-200 dark:border-white/5 p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Fitur Aktif</h3>
            <div className="space-y-2">
              {[
                '✅ Login & Manajemen Sesi',
                '✅ Role-Based Access Control (RBAC)',
                '✅ Pencatatan Pemasukan',
                '✅ Pencatatan Pengeluaran',
                '✅ Upload & Compress Foto Nota',
                '✅ Manajemen Hutang + Cicilan',
                '✅ Kategori Pengeluaran',
                '✅ Dashboard dengan Grafik',
                '✅ Filter & Search Transaksi',
                '✅ Laporan + Export CSV/Excel/PDF',
                '✅ Audit Log Aktivitas',
                '✅ Manajemen Pengguna',
                '✅ Notifikasi Hutang Jatuh Tempo',
                '✅ Row Level Security (RLS)',
                '✅ Soft Delete Transaksi',
                '✅ Responsive Mobile',
              ].map((f, i) => (
                <p key={i} className="text-xs text-slate-700 dark:text-slate-300">{f}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
