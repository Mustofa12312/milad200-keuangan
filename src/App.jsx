import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'

// Pages — Auth
import Login from '@/pages/auth/Login'

// Pages — Core
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

// Pages — Admin
import CategoryList from '@/pages/categories/CategoryList'
import UserList from '@/pages/users/UserList'
import Reports from '@/pages/reports/Reports'
import AuditLog from '@/pages/audit/AuditLog'
import Settings from '@/pages/settings/Settings'
import CancelledTransactions from '@/pages/transactions/CancelledTransactions'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Helper wrapper to reduce repetition
const Page = ({ children, adminOnly = false }) => (
  <ProtectedRoute adminOnly={adminOnly}>
    <AppLayout>
      {children}
    </AppLayout>
  </ProtectedRoute>
)

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Redirect root */}
            <Route path="/" element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } />

            {/* Dashboard */}
            <Route path="/dashboard" element={<Page><Dashboard /></Page>} />

            {/* Income */}
            <Route path="/income" element={<Page><IncomeList /></Page>} />
            <Route path="/income/create" element={<Page><IncomeCreate /></Page>} />
            <Route path="/income/:id/edit" element={<Page><IncomeEdit /></Page>} />

            {/* Expense */}
            <Route path="/expense" element={<Page><ExpenseList /></Page>} />
            <Route path="/expense/create" element={<Page><ExpenseCreate /></Page>} />
            <Route path="/expense/:id/edit" element={<Page><ExpenseEdit /></Page>} />

            {/* Debt */}
            <Route path="/debt" element={<Page><DebtList /></Page>} />
            <Route path="/debt/create" element={<Page><DebtCreate /></Page>} />
            <Route path="/debt/:id" element={<Page><DebtDetail /></Page>} />

            {/* Reports (all users) */}
            <Route path="/reports" element={<Page><Reports /></Page>} />

            {/* Settings (all users) */}
            <Route path="/settings" element={<Page><Settings /></Page>} />

            {/* Admin only */}
            <Route path="/categories" element={<Page adminOnly><CategoryList /></Page>} />
            <Route path="/users" element={<Page adminOnly><UserList /></Page>} />
            <Route path="/audit" element={<Page adminOnly><AuditLog /></Page>} />
            <Route path="/cancelled" element={<Page adminOnly><CancelledTransactions /></Page>} />

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
              fontFamily: 'Inter, system-ui, sans-serif',
              maxWidth: '380px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#1e293b' },
              duration: 3000,
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
              duration: 5000,
            },
            loading: {
              iconTheme: { primary: '#3b82f6', secondary: '#1e293b' },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
