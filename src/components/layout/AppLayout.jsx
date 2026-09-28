import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, TrendingDown, CreditCard,
  Tags, Users, FileText, ClipboardList, Trash2,
  Menu, X, LogOut, ChevronRight, Bell, AlertTriangle,
  Settings,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { debtService } from '@/services/debts'
import { getInitials, formatDate, formatCurrency } from '@/utils/format'
import { Link } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'USER'] },
  { to: '/income', icon: TrendingUp, label: 'Pemasukan', roles: ['ADMIN', 'USER'] },
  { to: '/expense', icon: TrendingDown, label: 'Pengeluaran', roles: ['ADMIN', 'USER'] },
  { to: '/debt', icon: CreditCard, label: 'Hutang', roles: ['ADMIN', 'USER'] },
  { to: '/reports', icon: FileText, label: 'Laporan', roles: ['ADMIN', 'USER'] },
  { to: '/categories', icon: Tags, label: 'Kategori', roles: ['ADMIN'] },
  { to: '/users', icon: Users, label: 'Pengguna', roles: ['ADMIN'] },
  { to: '/audit', icon: ClipboardList, label: 'Audit Log', roles: ['ADMIN'] },
  { to: '/cancelled', icon: Trash2, label: 'Dibatalkan', roles: ['ADMIN'] },
  { to: '/settings', icon: Settings, label: 'Pengaturan', roles: ['ADMIN', 'USER'] },
]


// Mobile bottom nav — only core items
const MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/income', icon: TrendingUp, label: 'Masuk' },
  { to: '/expense', icon: TrendingDown, label: 'Keluar' },
  { to: '/debt', icon: CreditCard, label: 'Hutang' },
  { to: '/reports', icon: FileText, label: 'Laporan' },
]

const AppLayout = ({ children }) => {
  const { profile, isAdmin, role, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Fetch overdue debts for notification
  const { data: debtData } = useQuery({
    queryKey: ['debts-overdue'],
    queryFn: () => debtService.getOverdueDebts(),
    staleTime: 60000,
    enabled: isAdmin,
  })
  const overdueCount = debtData?.length || 0

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(role))
  const currentPage = filteredNav.find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard'

  const SidebarContent = () => (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-100 leading-tight">Laporan Keuangan</p>
            <p className="text-[10px] text-slate-500 leading-tight truncate">200 Tahun Panyeppen</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2 mt-1">Menu Utama</p>
        {filteredNav.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={15} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
        {isAdmin && filteredNav.length > 5 && (
          <>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2 mt-4">Admin</p>
            {filteredNav.slice(5).map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={15} className="flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom: Profile + Settings */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={15} />
          <span>Pengaturan</span>
        </NavLink>
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors mt-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
            {getInitials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{profile?.full_name || 'User'}</p>
            <p className="text-[10px] text-slate-500">{isAdmin ? 'Admin' : 'Petugas'}</p>
          </div>
          <button onClick={handleSignOut} className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded" title="Keluar">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-56 flex-shrink-0 flex-col glass border-r border-white/5">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 modal-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`lg:hidden fixed left-0 top-0 bottom-0 z-50 w-60 glass flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <span className="text-sm font-semibold text-slate-200">Menu</span>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
        <SidebarContent />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-white/5 glass flex-shrink-0 z-30">
          <button className="lg:hidden text-slate-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-1.5 text-sm text-slate-500 hidden sm:flex">
            <span className="text-[10px] text-slate-600">200 Tahun Panyeppen</span>
            <ChevronRight size={12} />
            <span className="font-medium text-slate-300 text-xs">{currentPage}</span>
          </div>

          <div className="flex-1" />

          {/* Overdue debt notification */}
          {isAdmin && overdueCount > 0 && (
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative text-amber-400 hover:text-amber-300 transition-colors p-1.5 rounded-lg hover:bg-amber-400/10"
              >
                <Bell size={16} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {overdueCount > 9 ? '9+' : overdueCount}
                </span>
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 w-72 glass border border-white/10 rounded-xl shadow-2xl animate-fade-in overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-xs font-semibold text-slate-200">Hutang Jatuh Tempo</p>
                      <p className="text-[10px] text-slate-500">{overdueCount} hutang perlu perhatian</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                      {debtData?.slice(0, 5).map(debt => (
                        <Link
                          key={debt.id}
                          to={`/debt/${debt.id}`}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                          onClick={() => setNotifOpen(false)}
                        >
                          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate">{debt.party_name}</p>
                            <p className="text-[10px] text-red-400">Jatuh tempo: {formatDate(debt.due_date)}</p>
                            <p className="text-[10px] text-slate-500">Sisa: {formatCurrency(debt.remaining_amount)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-white/5">
                      <Link to="/debt" onClick={() => setNotifOpen(false)} className="text-xs text-blue-400 hover:text-blue-300">
                        Lihat semua hutang →
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Desktop user */}
          <Link to="/settings" className="hidden lg:flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1 transition-colors">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
              {getInitials(profile?.full_name)}
            </div>
            <span className="text-xs text-slate-400">{profile?.full_name?.split(' ')[0] || 'User'}</span>
          </Link>

          {/* Mobile avatar */}
          <Link to="/settings" className="lg:hidden w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
            {getInitials(profile?.full_name)}
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 pb-24 lg:pb-6 page-enter">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/5">
          <div className="flex items-center justify-around px-1 py-2">
            {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'text-blue-400 bg-blue-500/15'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

export default AppLayout
