import { getToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 204) return undefined as T

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`)
  }

  return data as T
}

export const api = {
  get:    <T>(endpoint: string)                  => request<T>(endpoint),
  post:   <T>(endpoint: string, body: unknown)   => request<T>(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(endpoint: string, body: unknown)   => request<T>(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(endpoint: string, body?: unknown)  => request<T>(endpoint, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string)                  => request<T>(endpoint, { method: 'DELETE' }),
}
