// ============================================================
// TIPOS DE MOVIMENTAÇÃO
// ============================================================
export type Operacao = '+' | '-'

export interface TipoMovimentacao {
  TIMIDTIPO: string
  TIMIDUSUARIOCADASTRO: string
  TIMCODIGO: string
  TIMDESCRICAO: string
  TIMOPERACAO: Operacao
  TIMEXIGEJUSTIFICATIVA: boolean
  TIMATIVO: boolean
  TIMDATACADASTRO: string
  TIMDATAATUALIZACAO: string
}

export type TipoMovimentacaoInsert = {
  codigo: string
  descricao: string
  operacao: Operacao
  exige_justificativa?: boolean
}

export type TipoMovimentacaoUpdate = Partial<TipoMovimentacaoInsert & { ativo: boolean }>

export const TIPOS_MOVIMENTACAO_PADRAO: TipoMovimentacaoInsert[] = [
  { codigo: 'COMPRA',       descricao: 'Entrada por compra',           operacao: '+', exige_justificativa: false },
  { codigo: 'VENDA',        descricao: 'Saída por venda',              operacao: '-', exige_justificativa: false },
  { codigo: 'AJUSTE_POS',   descricao: 'Ajuste positivo de estoque',   operacao: '+', exige_justificativa: true  },
  { codigo: 'AJUSTE_NEG',   descricao: 'Ajuste negativo de estoque',   operacao: '-', exige_justificativa: true  },
  { codigo: 'PERDA',        descricao: 'Perda / avaria',               operacao: '-', exige_justificativa: true  },
  { codigo: 'CANCELAMENTO', descricao: 'Cancelamento de movimentação', operacao: '+', exige_justificativa: true  },
]

// ============================================================
// UNIDADES DE MEDIDA
// ============================================================
export interface UnidadeMedida {
  UNIIDUNIDADE: string
  UNIIDUSUARIOCADASTRO: string
  UNISIGLA: string
  UNIDESCRICAO: string
  UNIATIVO: boolean
  UNIDATACADASTRO: string
  UNIDATAATUALIZACAO: string
}

export type UnidadeMedidaInsert = {
  sigla: string
  descricao: string
}

export type UnidadeMedidaUpdate = Partial<UnidadeMedidaInsert & { ativo: boolean }>

// ============================================================
// CATEGORIAS
// ============================================================
export interface Categoria {
  CATIDCATEGORIA: string
  CATIDUSUARIOCADASTRO: string
  CATNOME: string
  CATATIVO: boolean
  CATDATACADASTRO: string
  CATDATAATUALIZACAO: string
}

export type CategoriaInsert = {
  nome: string
}

export type CategoriaUpdate = Partial<CategoriaInsert & { ativo: boolean }>

// ============================================================
// PRODUTOS
// ============================================================
export interface Produto {
  PROIDPRODUTO: string
  PROIDUSUARIOCADASTRO: string
  PROIDCATEGORIA: string | null
  PRONOME: string
  PROSKU: string | null
  PRODESCRICAO: string | null
  PROUNIDADE: string
  PROIDUNIDADE: string | null
  PROPRECOCUSTO: number | null
  PROPRECOVENDA: number | null
  PROESTOQUEATUAL: number
  PROESTOQUEMINIMO: number
  PROATIVO: boolean
  PRODATACADASTRO: string
  PRODATAATUALIZACAO: string
  // Relações
  categoria?: { id: string; nome: string } | null
  unidade?: { id: string; sigla: string; descricao: string } | null
}

export type ProdutoInsert = {
  nome: string
  sku?: string | null
  descricao?: string | null
  unidade_id?: string | null
  preco_custo?: number | null
  preco_venda?: number | null
  estoque_atual?: number
  estoque_minimo?: number
  categoria_id?: string | null
}

export type ProdutoUpdate = Partial<ProdutoInsert & { ativo: boolean }>

// ============================================================
// MOVIMENTAÇÕES
// ============================================================
export type TipoReferencia = 'venda' | 'compra' | 'ajuste' | 'cancelamento' | 'perda' | 'outro'

export interface Movimentacao {
  MOVIDMOVIMENTACAO: string
  MOVIDUSUARIOCADASTRO: string
  MOVIDPRODUTO: string
  MOVIDTIPO: string
  MOVQUANTIDADE: number
  MOVJUSTIFICATIVA: string | null
  MOVTIPOREFERENCIA: TipoReferencia | null
  MOVIDREFERENCIA: string | null
  MOVOBSERVACAO: string | null
  MOVDATACADASTRO: string
  // Relações
  produto?: { id: string; nome: string; sku: string | null; unidade: string }
  tipo_movimentacao?: { id: string; codigo: string; descricao: string; operacao: Operacao }
}

export type MovimentacaoInsert = {
  produto_id: string
  tipo_id: string
  quantidade: number
  justificativa?: string | null
  tipo_referencia?: TipoReferencia | null
  id_referencia?: string | null
  observacao?: string | null
}

// ============================================================
// FILTROS
// ============================================================
export interface FiltrosMovimentacao {
  produto_id?: string
  tipo_id?: string
  operacao?: Operacao
  data_inicio?: string
  data_fim?: string
}
