import { api } from '../lib/api'
import { setToken, removeToken } from '../lib/auth'

interface AuthResponse {
  user: { id: string; login: string; nome: string }
  token: string
}

interface Usuario {
  id: string
  login: string
  nome: string
  criado_em: string
}

export const authService = {
  async register(login: string, nome: string, senha: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/register', { login, nome, senha })
    setToken(data.token)
    return data
  },

  async login(login: string, senha: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/login', { login, senha })
    setToken(data.token)
    return data
  },

  async me(): Promise<Usuario> {
    return api.get<Usuario>('/auth/me')
  },

  logout(): void {
    removeToken()
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('estoque_token')
  },
}
