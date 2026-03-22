import { api } from '../lib/api'
import type { TipoMovimentacao, TipoMovimentacaoInsert, TipoMovimentacaoUpdate } from '../types'

export const movementTypeService = {
  async getAll(): Promise<TipoMovimentacao[]> {
    return api.get<TipoMovimentacao[]>('/movement-types')
  },

  async getActive(): Promise<TipoMovimentacao[]> {
    return api.get<TipoMovimentacao[]>('/movement-types/active')
  },

  async getById(id: string): Promise<TipoMovimentacao> {
    return api.get<TipoMovimentacao>(`/movement-types/${id}`)
  },

  async create(payload: TipoMovimentacaoInsert): Promise<TipoMovimentacao> {
    return api.post<TipoMovimentacao>('/movement-types', payload)
  },

  async update(id: string, payload: TipoMovimentacaoUpdate): Promise<TipoMovimentacao> {
    return api.put<TipoMovimentacao>(`/movement-types/${id}`, payload)
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/movement-types/${id}`)
  },
}
