import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import AppLayout from './layouts/AppLayout'

import LoginPage      from './pages/auth/LoginPage'
import DashboardPage  from './pages/dashboard/DashboardPage'
import CategoriesPage from './pages/categories/CategoriesPage'
import UnitsPage      from './pages/units/UnitsPage'
import ProductsPage   from './pages/products/ProductsPage'
import MovementTypesPage from './pages/movementTypes/MovementTypesPage'
import MovementsPage  from './pages/movements/MovementsPage'
import ReportsPage    from './pages/reports/ReportsPage'
import SettingsPage   from './pages/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime:    1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect:   true,
    },
  },
})

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
      <span className="text-sm text-gray-400">Carregando...</span>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard"     element={<DashboardPage />} />
                  <Route path="/categorias"    element={<CategoriesPage />} />
                  <Route path="/unidades"      element={<UnitsPage />} />
                  <Route path="/produtos"      element={<ProductsPage />} />
                  <Route path="/tipos-movimentacao" element={<MovementTypesPage />} />
                  <Route path="/movimentacoes" element={<MovementsPage />} />
                  <Route path="/relatorios"    element={<ReportsPage />} />
                  <Route path="/configuracoes" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
