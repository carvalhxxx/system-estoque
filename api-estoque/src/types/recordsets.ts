// Interfaces para recordsets SQL — elimina `as any` nos routes

export interface ProdutoRow {
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
  categoria_id_ref: string | null
  categoria_nome: string | null
  unidade_id_ref: string | null
  unidade_sigla: string | null
  unidade_descricao: string | null
}

export interface MovimentacaoRow {
  MOVIDMOVIMENTACAO: string
  MOVIDUSUARIOCADASTRO: string
  MOVIDPRODUTO: string
  MOVIDTIPO: string
  MOVQUANTIDADE: number
  MOVJUSTIFICATIVA: string | null
  MOVTIPOREFERENCIA: string | null
  MOVIDREFERENCIA: string | null
  MOVOBSERVACAO: string | null
  MOVDATACADASTRO: string
  produto_id_ref: string
  produto_nome: string
  produto_sku: string | null
  produto_unidade: string
  tipo_id_ref: string
  tipo_codigo: string
  tipo_descricao: string
  tipo_operacao: '+' | '-'
}

export interface MovimentacaoByProductRow {
  MOVIDMOVIMENTACAO: string
  MOVIDUSUARIOCADASTRO: string
  MOVIDPRODUTO: string
  MOVIDTIPO: string
  MOVQUANTIDADE: number
  MOVJUSTIFICATIVA: string | null
  MOVTIPOREFERENCIA: string | null
  MOVIDREFERENCIA: string | null
  MOVOBSERVACAO: string | null
  MOVDATACADASTRO: string
  tipo_id_ref: string
  tipo_codigo: string
  tipo_descricao: string
  tipo_operacao: '+' | '-'
}

export interface ReportInternalRow {
  PROIDPRODUTO: string
  PRONOME: string
  PROSKU: string | null
  PRODESCRICAO: string | null
  PROPRECOCUSTO: number | null
  PROPRECOVENDA: number | null
  PROESTOQUEATUAL: number
  PROESTOQUEMINIMO: number
  categoria_nome: string | null
  unidade_sigla: string | null
}

export interface ReportClientRow {
  PROIDPRODUTO: string
  PRONOME: string
  PROSKU: string | null
  PRODESCRICAO: string | null
  PROPRECOVENDA: number
  categoria_nome: string | null
  unidade_sigla: string | null
}

export interface ReportMovementRow {
  MOVIDMOVIMENTACAO: string
  MOVQUANTIDADE: number
  MOVJUSTIFICATIVA: string | null
  MOVOBSERVACAO: string | null
  MOVDATACADASTRO: string
  produto_nome: string
  produto_sku: string | null
  tipo_codigo: string
  tipo_descricao: string
  tipo_operacao: '+' | '-'
}
