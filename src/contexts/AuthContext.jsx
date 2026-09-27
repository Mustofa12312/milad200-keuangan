import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '@/services/auth'
import { logAudit } from '@/services/auditLog'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProfile = async (authUser) => {
    if (!authUser) return
    try {
      const profileData = await authService.getProfile(authUser.id)
      setProfile(profileData)
    } catch (err) {
      console.error('Profile load error:', err)
      // Profile might not exist yet for new users
      setProfile(null)
    }
  }

  useEffect(() => {
    // Initialize session
    authService.getSession().then(async (session) => {
      const authUser = session?.user ?? null
      setUser(authUser)
      if (authUser) await loadProfile(authUser)
      setLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      const authUser = session?.user ?? null
      setUser(authUser)
      if (authUser) {
        await loadProfile(authUser)
        if (event === 'SIGNED_IN') {
          await logAudit(authUser.id, 'LOGIN', 'auth', authUser.id, null, { email: authUser.email })
        }
      } else {
        setProfile(null)
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    setError(null)
    const data = await authService.signIn(email, password)
    return data
  }

  const signOut = async () => {
    if (user) {
      await logAudit(user.id, 'LOGOUT', 'auth', user.id, null, null)
    }
    await authService.signOut()
    setUser(null)
    setProfile(null)
  }

  const resetPassword = async (email) => {
    await authService.resetPassword(email)
  }

  const isAdmin = profile?.roles?.name === 'ADMIN'
  const isUser = profile?.roles?.name === 'USER' || isAdmin
  const role = profile?.roles?.name || 'USER'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      error,
      isAdmin,
      isUser,
      role,
      signIn,
      signOut,
      resetPassword,
      refreshProfile: () => loadProfile(user),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
