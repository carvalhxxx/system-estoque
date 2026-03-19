import { supabase } from '../lib/supabase'
import type { Movement, MovementFilters, MovementInsert } from '../types'

export const movementService = {
  async getAll(userId: string, filters?: MovementFilters): Promise<Movement[]> {
    let query = supabase
      .from('movements')
      .select(`
        *,
        product:products(id, name, sku, unit),
        movement_type:movement_types(id, code, description, operation)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filters?.product_id)       query = query.eq('product_id', filters.product_id)
    if (filters?.movement_type_id) query = query.eq('movement_type_id', filters.movement_type_id)
    if (filters?.date_from)        query = query.gte('created_at', `${filters.date_from}T00:00:00`)
    if (filters?.date_to)          query = query.lte('created_at', `${filters.date_to}T23:59:59`)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getByProduct(productId: string, limit = 50): Promise<Movement[]> {
    const { data, error } = await supabase
      .from('movements')
      .select(`
        *,
        movement_type:movement_types(id, code, description, operation)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Movement> {
    const { data, error } = await supabase
      .from('movements')
      .select(`
        *,
        product:products(id, name, sku, unit),
        movement_type:movement_types(id, code, description, operation)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Cria uma movimentação.
   * A validação de estoque e a atualização de current_stock
   * são feitas atomicamente pelo trigger process_movement no banco.
   */
  async create(userId: string, payload: MovementInsert): Promise<Movement> {
    const { data, error } = await supabase
      .from('movements')
      .insert({ ...payload, user_id: userId })
      .select(`
        *,
        product:products(id, name, sku, unit),
        movement_type:movement_types(id, code, description, operation)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Cancela uma movimentação criando uma movimentação inversa.
   * Usa a função cancel_movement do banco para garantir atomicidade.
   */
  async cancel(movementId: string, userId: string, justification: string): Promise<string> {
    const { data, error } = await supabase.rpc('cancel_movement', {
      p_movement_id:   movementId,
      p_user_id:       userId,
      p_justification: justification,
    })

    if (error) throw error
    return data as string
  },

  // Movimentações são imutáveis — sem update() nem delete()
}
