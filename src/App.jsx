import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'

// Pages
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/dashboard/Dashboard'
import IncomeList from '@/pages/income/IncomeList'
import IncomeCreate from '@/pages/income/IncomeCreate'
import IncomeEdit from '@/pages/income/IncomeEdit'
import ExpenseList from '@/pages/expense/ExpenseList'
import ExpenseCreate from '@/pages/expense/ExpenseCreate'
import ExpenseEdit from '@/pages/expense/ExpenseEdit'
import DebtList from '@/pages/debt/DebtList'
import DebtCreate from '@/pages/debt/DebtCreate'
import DebtDetail from '@/pages/debt/DebtDetail'
import CategoryList from '@/pages/categories/CategoryList'
import UserList from '@/pages/users/UserList'
import Reports from '@/pages/reports/Reports'
import AuditLog from '@/pages/audit/AuditLog'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Navigate to="/dashboard" replace />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
            } />

            {/* Income */}
            <Route path="/income" element={
              <ProtectedRoute><AppLayout><IncomeList /></AppLayout></ProtectedRoute>
            } />
            <Route path="/income/create" element={
              <ProtectedRoute><AppLayout><IncomeCreate /></AppLayout></ProtectedRoute>
            } />
            <Route path="/income/:id/edit" element={
              <ProtectedRoute><AppLayout><IncomeEdit /></AppLayout></ProtectedRoute>
            } />

            {/* Expense */}
            <Route path="/expense" element={
              <ProtectedRoute><AppLayout><ExpenseList /></AppLayout></ProtectedRoute>
            } />
            <Route path="/expense/create" element={
              <ProtectedRoute><AppLayout><ExpenseCreate /></AppLayout></ProtectedRoute>
            } />
            <Route path="/expense/:id/edit" element={
              <ProtectedRoute><AppLayout><ExpenseEdit /></AppLayout></ProtectedRoute>
            } />

            {/* Debt */}
            <Route path="/debt" element={
              <ProtectedRoute><AppLayout><DebtList /></AppLayout></ProtectedRoute>
            } />
            <Route path="/debt/create" element={
              <ProtectedRoute><AppLayout><DebtCreate /></AppLayout></ProtectedRoute>
            } />
            <Route path="/debt/:id" element={
              <ProtectedRoute><AppLayout><DebtDetail /></AppLayout></ProtectedRoute>
            } />

            {/* Admin only */}
            <Route path="/categories" element={
              <ProtectedRoute adminOnly><AppLayout><CategoryList /></AppLayout></ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute adminOnly><AppLayout><UserList /></AppLayout></ProtectedRoute>
            } />
            <Route path="/audit" element={
              <ProtectedRoute adminOnly><AppLayout><AuditLog /></AppLayout></ProtectedRoute>
            } />

            {/* Reports */}
            <Route path="/reports" element={
              <ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#1e293b' },
              duration: 3000,
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
              duration: 5000,
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
