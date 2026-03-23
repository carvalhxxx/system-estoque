import { api } from '../lib/api'
import type { UnidadeMedida, UnidadeMedidaInsert, UnidadeMedidaUpdate } from '../types'

export const unitService = {
  async getAll(): Promise<UnidadeMedida[]> {
    return api.get<UnidadeMedida[]>('/units')
  },

  async getById(id: string): Promise<UnidadeMedida> {
    return api.get<UnidadeMedida>(`/units/${id}`)
  },

  async create(payload: UnidadeMedidaInsert): Promise<UnidadeMedida> {
    return api.post<UnidadeMedida>('/units', payload)
  },

  async update(id: string, payload: UnidadeMedidaUpdate): Promise<UnidadeMedida> {
    return api.put<UnidadeMedida>(`/units/${id}`, payload)
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/units/${id}`)
  },
}
