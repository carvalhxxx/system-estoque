import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getToken, setToken, removeToken } from '../lib/auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'

interface User {
  id: string
  login: string
  nome: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (login: string, senha: string) => Promise<void>
  signOut: () => Promise<void>
  updateUser: (partial: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const token = getToken()
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          setUser(res.ok ? await res.json() : null)
        } catch {
          setUser(null)
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  async function signIn(login: string, senha: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, senha }),
    })

    if (!res.ok) throw new Error('Login ou senha inválidos')

    const { user, token } = await res.json()
    setToken(token)
    setUser(user)
  }

  async function signOut() {
    removeToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser: (partial) => setUser(u => u ? { ...u, ...partial } : u) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
