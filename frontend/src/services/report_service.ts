import { api } from '../lib/api'

export interface ProdutoRelatorioInterno {
  id: string
  nome: string
  sku: string | null
  descricao: string | null
  categoria: string
  unidade: string
  preco_custo: number
  preco_venda: number
  estoque_atual: number
  estoque_minimo: number
  valor_total_custo: number
  valor_total_venda: number
  lucro_unitario: number
  lucro_total: number
}

export interface TotaisRelatorio {
  total_produtos: number
  total_pecas: number
  total_custo: number
  total_venda: number
  lucro_total: number
}

export interface RelatorioInterno {
  produtos: ProdutoRelatorioInterno[]
  totais: TotaisRelatorio
}

export interface ProdutoRelatorioCliente {
  id: string
  nome: string
  sku: string | null
  descricao: string | null
  categoria: string
  unidade: string
  preco_venda: number
}

export interface RelatorioCliente {
  produtos: ProdutoRelatorioCliente[]
}

export interface MovimentacaoRelatorio {
  id: string
  data: string
  produto: string
  sku: string | null
  tipo_codigo: string
  tipo_descricao: string
  operacao: '+' | '-'
  quantidade: number
  justificativa: string | null
  observacao: string | null
}

export interface TotaisMovimentacao {
  total: number
  total_entradas: number
  total_saidas: number
  qtd_entradas: number
  qtd_saidas: number
}

export interface RelatorioMovimentacoes {
  movimentacoes: MovimentacaoRelatorio[]
  totais: TotaisMovimentacao
}

export interface FiltrosRelatorioMov {
  produto_id?: string
  tipo_id?: string
  operacao?: '+' | '-'
  data_inicio?: string
  data_fim?: string
}

export const reportService = {
  async getInternal(categoriaId?: string): Promise<RelatorioInterno> {
    const params = categoriaId ? `?categoria_id=${categoriaId}` : ''
    return api.get<RelatorioInterno>(`/reports/internal${params}`)
  },

  async getClient(categoriaId?: string): Promise<RelatorioCliente> {
    const params = categoriaId ? `?categoria_id=${categoriaId}` : ''
    return api.get<RelatorioCliente>(`/reports/client${params}`)
  },

  async getMovements(filtros: FiltrosRelatorioMov): Promise<RelatorioMovimentacoes> {
    const params = new URLSearchParams()
    if (filtros.produto_id) params.set('produto_id', filtros.produto_id)
    if (filtros.tipo_id) params.set('tipo_id', filtros.tipo_id)
    if (filtros.operacao) params.set('operacao', filtros.operacao)
    if (filtros.data_inicio) params.set('data_inicio', filtros.data_inicio)
    if (filtros.data_fim) params.set('data_fim', filtros.data_fim)
    const qs = params.toString()
    return api.get<RelatorioMovimentacoes>(`/reports/movements${qs ? `?${qs}` : ''}`)
  },
}
