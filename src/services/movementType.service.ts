import { supabase } from '../lib/supabase'
import type { MovementType, MovementTypeInsert, MovementTypeUpdate } from '../types'

export const movementTypeService = {
  async getAll(userId: string): Promise<MovementType[]> {
    const { data, error } = await supabase
      .from('movement_types')
      .select('*')
      .eq('user_id', userId)
      .order('code')

    if (error) throw error
    return data || []
  },

  async getActive(userId: string): Promise<MovementType[]> {
    const { data, error } = await supabase
      .from('movement_types')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('code')

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<MovementType> {
    const { data, error } = await supabase
      .from('movement_types')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(userId: string, payload: MovementTypeInsert): Promise<MovementType> {
    const { data, error } = await supabase
      .from('movement_types')
      .insert({ ...payload, user_id: userId })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, payload: MovementTypeUpdate): Promise<MovementType> {
    const { data, error } = await supabase
      .from('movement_types')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('movement_types')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
