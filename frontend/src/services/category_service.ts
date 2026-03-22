import { api } from '../lib/api'
import type { Categoria, CategoriaInsert, CategoriaUpdate } from '../types'

export const categoryService = {
  async getAll(): Promise<Categoria[]> {
    return api.get<Categoria[]>('/categories')
  },

  async getById(id: string): Promise<Categoria> {
    return api.get<Categoria>(`/categories/${id}`)
  },

  async create(payload: CategoriaInsert): Promise<Categoria> {
    return api.post<Categoria>('/categories', payload)
  },

  async update(id: string, payload: CategoriaUpdate): Promise<Categoria> {
    return api.put<Categoria>(`/categories/${id}`, payload)
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/categories/${id}`)
  },
}
