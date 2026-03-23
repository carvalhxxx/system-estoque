import { api } from '../lib/api'

export interface DashboardStats {
  totalProdutosAtivos: number
  totalEstoqueBaixo: number
  totalCategorias: number
  totalMovimentacoes: number
  entradasHoje: number
  saidasHoje: number
}

export interface ProdutoEstoqueBaixo {
  PROIDPRODUTO: string
  PRONOME: string
  PROSKU: string | null
  PROESTOQUEATUAL: number
  PROESTOQUEMINIMO: number
  categoria_nome: string | null
}

export interface MovimentacaoRecente {
  MOVIDMOVIMENTACAO: string
  MOVQUANTIDADE: number
  MOVDATACADASTRO: string
  produto_nome: string
  produto_sku: string | null
  tipo_codigo: string
  tipo_operacao: '+' | '-'
}

export interface StockByCategory {
  categoria: string
  total_produtos: number
  total_estoque: number
  valor_total: number
}

export interface MovementTrend {
  mes: string
  mes_label: string
  entradas: number
  saidas: number
  total_entradas: number
  total_saidas: number
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return api.get<DashboardStats>('/dashboard/stats')
  },

  async getLowStock(): Promise<ProdutoEstoqueBaixo[]> {
    return api.get<ProdutoEstoqueBaixo[]>('/dashboard/low-stock')
  },

  async getRecentMovements(): Promise<MovimentacaoRecente[]> {
    return api.get<MovimentacaoRecente[]>('/dashboard/recent-movements')
  },

  async getStockByCategory(): Promise<StockByCategory[]> {
    return api.get<StockByCategory[]>('/dashboard/stock-by-category')
  },

  async getMovementTrends(): Promise<MovementTrend[]> {
    return api.get<MovementTrend[]>('/dashboard/movement-trends')
  },
}
