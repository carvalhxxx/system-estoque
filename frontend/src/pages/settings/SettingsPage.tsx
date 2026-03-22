import { useState } from 'react'
import { User, Key, Sun, Moon, Monitor } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { api } from '../../lib/api'

// ── Perfil ──────────────────────────────────────────────────
function PerfilSection() {
  const { user, updateUser } = useAuth()
  const [nome, setNome] = useState(user?.nome ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/profile', { nome })
      updateUser({ nome })
      toast.success('Nome atualizado!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Perfil</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Login</label>
          <input className="input-field bg-gray-50 dark:bg-slate-800" value={user?.login ?? ''} readOnly />
        </div>

        <div>
          <label className="label">Nome</label>
          <input
            className="input-field"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Seu nome"
            required
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving || nome === user?.nome} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Alterar Senha ───────────────────────────────────────────
function SenhaSection() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha]   = useState('')
  const [confirmar, setConfirmar]   = useState('')
  const [saving, setSaving]         = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (novaSenha !== confirmar) {
      toast.error('As senhas não coincidem.')
      return
    }

    setSaving(true)
    try {
      await api.put('/auth/password', { senhaAtual, novaSenha })
      toast.success('Senha alterada com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmar('')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Alterar Senha</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Senha Atual</label>
          <input
            type="password"
            className="input-field"
            value={senhaAtual}
            onChange={e => setSenhaAtual(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Nova Senha</label>
          <input
            type="password"
            className="input-field"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            minLength={6}
            required
          />
          <p className="text-xs text-gray-400 mt-1">Minimo de 6 caracteres</p>
        </div>

        <div>
          <label className="label">Confirmar Nova Senha</label>
          <input
            type="password"
            className="input-field"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Aparência ───────────────────────────────────────────────
function AparenciaSection() {
  const { theme, toggle } = useTheme()

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Aparencia</h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => theme !== 'light' && toggle()}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            theme === 'light'
              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500'
              : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sun className="w-4 h-4" />
          Claro
        </button>

        <button
          onClick={() => theme !== 'dark' && toggle()}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500'
              : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          <Moon className="w-4 h-4" />
          Escuro
        </button>
      </div>
    </div>
  )
}

// ── Pagina principal ────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configuracoes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <PerfilSection />
          <AparenciaSection />
        </div>
        <SenhaSection />
      </div>
    </div>
  )
}
