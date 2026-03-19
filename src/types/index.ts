// ============================================================
// MOVEMENT TYPES
// ============================================================
export type Operation = '+' | '-'

export interface MovementType {
  id: string
  user_id: string
  code: string
  description: string
  operation: Operation
  requires_justification: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export type MovementTypeInsert = Omit<MovementType, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type MovementTypeUpdate = Partial<MovementTypeInsert>

export const DEFAULT_MOVEMENT_TYPES: Omit<MovementTypeInsert, 'active'>[] = [
  { code: 'COMPRA',       description: 'Entrada por compra',           operation: '+', requires_justification: false },
  { code: 'VENDA',        description: 'Saída por venda',              operation: '-', requires_justification: false },
  { code: 'AJUSTE_POS',   description: 'Ajuste positivo de estoque',   operation: '+', requires_justification: true  },
  { code: 'AJUSTE_NEG',   description: 'Ajuste negativo de estoque',   operation: '-', requires_justification: true  },
  { code: 'PERDA',        description: 'Perda / avaria',               operation: '-', requires_justification: true  },
  { code: 'CANCELAMENTO', description: 'Cancelamento de movimentação', operation: '+', requires_justification: true  },
]

// ============================================================
// CATEGORIES
// ============================================================
export interface Category {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export type CategoryInsert = Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type CategoryUpdate = Partial<CategoryInsert>

// ============================================================
// PRODUCTS
// ============================================================
export interface Product {
  id: string
  user_id: string
  category_id: string | null
  name: string
  sku: string | null
  description: string | null
  unit: string
  cost_price: number | null
  sale_price: number | null
  current_stock: number
  min_stock: number
  active: boolean
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  movements?: Movement[]
}

export type ProductInsert = Omit<Product, 'id' | 'user_id' | 'current_stock' | 'created_at' | 'updated_at' | 'category' | 'movements'>
export type ProductUpdate = Partial<ProductInsert>

// Produto com alerta de estoque baixo
export interface ProductWithAlert extends Product {
  low_stock: boolean
}

// ============================================================
// MOVEMENTS
// ============================================================
export type RefType = 'venda' | 'compra' | 'ajuste' | 'cancelamento' | 'perda' | 'outro'

export interface Movement {
  id: string
  user_id: string
  product_id: string
  movement_type_id: string
  quantity: number
  justification: string | null
  ref_type: RefType | null
  ref_id: string | null
  notes: string | null
  created_at: string
  // Relations
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>
  movement_type?: Pick<MovementType, 'id' | 'code' | 'description' | 'operation'>
}

export type MovementInsert = Omit<
  Movement,
  'id' | 'user_id' | 'created_at' | 'product' | 'movement_type'
>

// ============================================================
// FILTERS & PAGINATION
// ============================================================
export interface MovementFilters {
  product_id?: string
  movement_type_id?: string
  operation?: Operation
  date_from?: string
  date_to?: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}
