import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [login, setLogin]       = useState('')
  const [senha, setSenha]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(login, senha)
      navigate('/dashboard')
    } catch {
      toast.error('Login ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
      <div className="card p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Sistema de Estoque
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Login</label>
            <input
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="input-field"
              placeholder="seu_login"
              required
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
