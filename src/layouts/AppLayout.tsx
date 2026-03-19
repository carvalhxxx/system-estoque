import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowLeftRight, Settings,
  ChevronRight, ChevronLeft, Sun, Moon, LogOut,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

const NAV_ITEMS = [
  { to: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/produtos',       label: 'Produtos',        icon: Package         },
  { to: '/movimentacoes',  label: 'Movimentações',   icon: ArrowLeftRight  },
  { to: '/configuracoes',  label: 'Configurações',   icon: Settings        },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col shrink-0 transition-all duration-200
          bg-white dark:bg-slate-900
          border-r border-gray-200 dark:border-slate-800
          ${collapsed ? 'w-14' : 'w-56'}
        `}
      >
        {/* Logo / Toggle */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-gray-200 dark:border-slate-800">
          {!collapsed && (
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
              Estoque
            </span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setCollapsed(true)}
              className={({ isActive }) => `
                flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium border-r-2 border-blue-600'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && <ChevronRight className="w-3 h-3 ml-auto text-gray-300 dark:text-slate-600" />}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-gray-200 dark:border-slate-800 space-y-0.5">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && <span>Tema</span>}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center px-6 gap-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
          <div className="flex-1" />
          <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
          <span className="font-semibold text-sm text-gray-700 dark:text-slate-300">
            Sistema de Estoque
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
