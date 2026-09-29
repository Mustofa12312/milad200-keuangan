import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react'
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
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center relative overflow-hidden px-4 sm:px-6 lg:px-8 selection:bg-blue-500/30 selection:text-slate-900 dark:text-white">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -right-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse-soft" />
        <div className="absolute -bottom-[25%] -left-[10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[100px] animate-pulse-soft" style={{ animationDelay: '3s' }} />
        
        {/* Subtle grid pattern for texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGc+PHBhdGggZD0iTTQwIDB2NDBIMFYweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zOS41IDB2NDAiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIvPjxwYXRoIGQ9Ik0wIDM5LjVoNDAiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIvPjwvZz48L3N2Zz4=')] opacity-30" />
      </div>

      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        {/* Header/Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 border border-slate-300 dark:border-white/10 relative group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 rounded-[1.5rem] bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="text-slate-900 dark:text-white font-black text-3xl tracking-tighter">KP</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight mb-2">
            {resetMode ? 'Reset Password' : 'Selamat Datang'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
            {resetMode
              ? 'Masukkan email untuk menerima link reset'
              : 'Laporan Keuangan 200 Tahun Panyeppen'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-8 border border-slate-300 dark:border-white/10 shadow-2xl shadow-black/50 relative overflow-hidden">
          {/* Subtle top border highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

          {resetSent ? (
            <div className="text-center py-6 animate-slide-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <Mail size={28} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Email Terkirim</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Link reset password telah dikirim ke <strong className="text-slate-800 dark:text-slate-200">{email}</strong>.<br/>Periksa kotak masuk atau spam Anda.
              </p>
              <button 
                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:border-white/10 active:scale-[0.98]" 
                onClick={() => { setResetMode(false); setResetSent(false) }}
              >
                Kembali ke Login
              </button>
            </div>
          ) : (
            <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-slide-in">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400 font-medium leading-relaxed">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Email</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="email"
                    className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {!resetMode && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  </div>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-300 dark:border-white/10 rounded-xl py-3 pl-11 pr-12 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2">
                {!resetMode ? (
                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-slate-900 dark:text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      {loading ? <Spinner size={18} /> : null}
                      {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-slate-900 dark:text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? <Spinner size={18} /> : null}
                    {loading ? 'Memproses...' : 'Kirim Link Reset'}
                  </button>
                )}
              </div>
              
              {!resetMode && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-400 transition-colors font-medium"
                    onClick={() => { setResetMode(true); setError(null) }}
                  >
                    Lupa password?
                  </button>
                </div>
              )}
              
              {resetMode && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-400 transition-colors font-medium flex items-center justify-center gap-1 mx-auto"
                    onClick={() => { setResetMode(false); setError(null) }}
                  >
                    <ArrowLeft size={14} /> Kembali ke Login
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-xs font-medium text-slate-600 mt-8">
          © 2026 Laporan Keuangan Panyeppen. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Login
