import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowLeftRight, Settings, Tag, Ruler, ListChecks, FileText,
  ChevronRight, ChevronLeft, Sun, Moon, LogOut, Menu, X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import LowStockBell from '../components/LowStockBell'

const NAV_ITEMS = [
  { to: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/categorias',     label: 'Categorias',      icon: Tag             },
  { to: '/unidades',       label: 'Unidades',        icon: Ruler           },
  { to: '/produtos',              label: 'Produtos',              icon: Package         },
  { to: '/tipos-movimentacao',   label: 'Tipos Movimentação',    icon: ListChecks      },
  { to: '/movimentacoes',        label: 'Movimentações',         icon: ArrowLeftRight  },
  { to: '/relatorios',            label: 'Relatórios',            icon: FileText        },
  { to: '/configuracoes',  label: 'Configurações',   icon: Settings        },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768)
  const [mobileOpen, setMobileOpen] = useState(false)
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
          hidden sm:flex flex-col shrink-0 transition-all duration-200
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
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-auto"
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
                flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors
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
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && <span>Tema</span>}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm text-gray-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            onClick={e => e.stopPropagation()}
            className="absolute left-0 top-0 bottom-0 w-56 flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800"
          >
            <div className="h-14 flex items-center justify-between px-3 border-b border-gray-200 dark:border-slate-800">
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">Estoque</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors
                    ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="p-2 border-t border-gray-200 dark:border-slate-800 space-y-0.5">
              <button onClick={() => { toggle(); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                <span>Tema</span>
              </button>
              <button onClick={() => { handleSignOut(); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm text-gray-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center px-4 sm:px-6 gap-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="sm:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <LowStockBell />
          <span className="font-semibold text-sm text-gray-700 dark:text-slate-300 truncate">
            Sistema de Estoque
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
