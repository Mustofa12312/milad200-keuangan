import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email atau password salah. Silakan coba lagi.'
        : err.message || 'Gagal masuk. Periksa koneksi internet Anda.')
    } finally {
      setLoading(false)
    }
  }

  // Temporary function to help user register the first admin account
  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error } = await import('@/services/supabase').then(m => m.default.auth.signUp({
        email,
        password,
      }))
      if (error) throw error
      
      if (data?.user?.identities?.length === 0) {
        setError('Akun ini sudah terdaftar. Silakan login.')
      } else {
        setError('Berhasil mendaftar! Jika Supabase meminta konfirmasi email, cek email Anda atau matikan "Confirm email" di Supabase Dashboard.')
      }
    } catch (err) {
      setError(err.message || 'Gagal mendaftar')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPassword(email)
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Gagal mengirim email reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <span className="text-white font-bold text-2xl">KP</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-100">
            {resetMode ? 'Reset Password' : 'Selamat Datang'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {resetMode
              ? 'Masukkan email untuk menerima link reset'
              : 'Laporan Keuangan 200 Tahun Panyeppen'}
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 border border-white/8">
          {resetSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail size={20} className="text-emerald-400" />
              </div>
              <h3 className="font-semibold text-slate-200 mb-2">Email Terkirim</h3>
              <p className="text-sm text-slate-400 mb-4">
                Link reset password telah dikirim ke <strong>{email}</strong>. Periksa inbox Anda.
              </p>
              <button className="btn btn-ghost w-full" onClick={() => { setResetMode(false); setResetSent(false) }}>
                Kembali ke Login
              </button>
            </div>
          ) : (
            <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    className="input-field pl-9"
                    placeholder="email@panyeppen.ac.id"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {!resetMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-9 pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {!resetMode ? (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 btn-lg"
                    disabled={loading}
                  >
                    {loading ? <Spinner size={16} /> : null}
                    {loading ? 'Memproses...' : 'Masuk'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegister}
                    className="btn btn-ghost flex-1 btn-lg border border-white/10"
                    disabled={loading}
                  >
                    {loading ? <Spinner size={16} /> : null}
                    {loading ? 'Memproses...' : 'Daftar (Setup)'}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary w-full btn-lg"
                  disabled={loading}
                >
                  {loading ? <Spinner size={16} /> : null}
                  {loading ? 'Memproses...' : 'Kirim Link Reset'}
                </button>
              )}
              <button
                type="button"
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors mt-2"
                onClick={() => { setResetMode(!resetMode); setError(null) }}
              >
                {resetMode ? '← Kembali ke Login' : 'Lupa password?'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 Laporan Keuangan Panyeppen. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Login
