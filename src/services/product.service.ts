import { supabase } from '../lib/supabase'
import type { Product, ProductInsert, ProductUpdate } from '../types'

export const productService = {
  async getAll(userId: string, search?: string): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('user_id', userId)
      .order('name')

    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getActive(userId: string, search?: string): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('user_id', userId)
      .eq('active', true)
      .order('name')

    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /** Retorna produtos com estoque abaixo do mínimo */
  async getLowStock(userId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('user_id', userId)
      .eq('active', true)
      .filter('current_stock', 'lt', 'min_stock')  // current_stock < min_stock
      .order('name')

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(userId: string, payload: ProductInsert): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...payload, user_id: userId })
      .select('*, category:categories(id, name)')
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, payload: ProductUpdate): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, category:categories(id, name)')
      .single()

    if (error) throw error
    return data
  },

  /** Inativa o produto (soft delete) */
  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
