import { api } from '../lib/api'
import type { Produto, ProdutoInsert, ProdutoUpdate } from '../types'

export const productService = {
  async getAll(search?: string): Promise<Produto[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    return api.get<Produto[]>(`/products${params}`)
  },

  async getActive(search?: string): Promise<Produto[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    return api.get<Produto[]>(`/products/active${params}`)
  },

  async getLowStock(): Promise<Produto[]> {
    return api.get<Produto[]>('/products/low-stock')
  },

  async getById(id: string): Promise<Produto> {
    return api.get<Produto>(`/products/${id}`)
  },

  async create(payload: ProdutoInsert): Promise<Produto> {
    return api.post<Produto>('/products', payload)
  },

  async update(id: string, payload: ProdutoUpdate): Promise<Produto> {
    return api.put<Produto>(`/products/${id}`, payload)
  },

  async deactivate(id: string): Promise<void> {
    await api.patch<void>(`/products/${id}/deactivate`)
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/products/${id}`)
  },
}
