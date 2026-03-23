import { api } from '../lib/api'
import type { Movimentacao, FiltrosMovimentacao, MovimentacaoInsert } from '../types'

export const movementService = {
  async getAll(filtros?: FiltrosMovimentacao): Promise<Movimentacao[]> {
    const params = new URLSearchParams()
    if (filtros?.produto_id) params.set('produto_id', filtros.produto_id)
    if (filtros?.tipo_id)    params.set('tipo_id',    filtros.tipo_id)
    if (filtros?.data_inicio) params.set('data_inicio', filtros.data_inicio)
    if (filtros?.data_fim)   params.set('data_fim',   filtros.data_fim)

    const qs = params.toString()
    return api.get<Movimentacao[]>(`/movements${qs ? `?${qs}` : ''}`)
  },

  async getByProduct(produtoId: string, limit = 50): Promise<Movimentacao[]> {
    return api.get<Movimentacao[]>(`/movements/by-product/${produtoId}?limit=${limit}`)
  },

  async getById(id: string): Promise<Movimentacao> {
    return api.get<Movimentacao>(`/movements/${id}`)
  },

  async create(payload: MovimentacaoInsert): Promise<Movimentacao> {
    return api.post<Movimentacao>('/movements', payload)
  },

  async cancel(movimentacaoId: string, justificativa: string): Promise<string> {
    const data = await api.post<{ novo_id_movimentacao: string }>(
      `/movements/${movimentacaoId}/cancel`,
      { justificativa }
    )
    return data.novo_id_movimentacao
  },
}
