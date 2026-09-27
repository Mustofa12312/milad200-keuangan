import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, TrendingDown, CreditCard,
  Tags, Users, FileText, ClipboardList, Settings,
  Menu, X, LogOut, ChevronRight, Bell, Search,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getInitials } from '@/utils/format'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'USER'] },
  { to: '/income', icon: TrendingUp, label: 'Pemasukan', roles: ['ADMIN', 'USER'] },
  { to: '/expense', icon: TrendingDown, label: 'Pengeluaran', roles: ['ADMIN', 'USER'] },
  { to: '/debt', icon: CreditCard, label: 'Hutang', roles: ['ADMIN', 'USER'] },
  { to: '/reports', icon: FileText, label: 'Laporan', roles: ['ADMIN', 'USER'] },
  { to: '/categories', icon: Tags, label: 'Kategori', roles: ['ADMIN'] },
  { to: '/users', icon: Users, label: 'Pengguna', roles: ['ADMIN'] },
  { to: '/audit', icon: ClipboardList, label: 'Audit Log', roles: ['ADMIN'] },
]

const AppLayout = ({ children }) => {
  const { profile, isAdmin, role, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(role))

  const Sidebar = () => (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">KP</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-100 leading-tight">Laporan Keuangan</p>
            <p className="text-[10px] text-slate-500 leading-tight truncate">200 Tahun Panyeppen</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={16} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profile */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
            {getInitials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{profile?.full_name || 'User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{isAdmin ? 'Administrator' : 'Petugas'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
            title="Keluar"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-56 flex-shrink-0 flex-col glass border-r border-white/5">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 modal-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`lg:hidden fixed left-0 top-0 bottom-0 z-50 w-56 glass flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <span className="text-sm font-semibold text-slate-200">Menu</span>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-white/5 glass flex-shrink-0">
          <button
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Page title from breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0">
            <ChevronRight size={14} className="flex-shrink-0" />
            <span className="font-medium text-slate-200 truncate">
              {filteredNav.find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard'}
            </span>
          </div>

          <div className="flex-1" />

          {/* Notification bell placeholder */}
          <button className="relative text-slate-500 hover:text-slate-300 transition-colors p-1">
            <Bell size={18} />
          </button>

          {/* Mobile user avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white lg:hidden">
            {getInitials(profile?.full_name)}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
