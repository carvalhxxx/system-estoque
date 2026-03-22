import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  // Erros de constraint do SQL Server
  const msg = err.message || ''

  if (msg.includes('UQ_') || msg.includes('duplicate')) {
    res.status(409).json({ error: extractConstraintMessage(msg) })
    return
  }

  if (msg.includes('FK_')) {
    res.status(409).json({ error: 'Registro possui dependencias vinculadas.' })
    return
  }

  if (msg.includes('Saldo insuficiente') || msg.includes('Justificativa obrigatória')) {
    res.status(422).json({ error: msg })
    return
  }

  if (msg.includes('não encontrada') || msg.includes('inversa')) {
    res.status(422).json({ error: msg })
    return
  }

  // Erro genérico — não vaza detalhes internos em produção
  console.error('[ERROR]', err)
  const isProduction = process.env.NODE_ENV === 'production'
  res.status(500).json({
    error: isProduction ? 'Erro interno do servidor.' : msg,
  })
}

function extractConstraintMessage(msg: string): string {
  if (msg.includes('UQ_PRODUTOS_USUARIO_SKU')) return 'Ja existe um produto com este SKU.'
  if (msg.includes('UQ_CATEGORIAS_USUARIO_NOME')) return 'Categoria com este nome ja existe.'
  if (msg.includes('UQ_UNIDADESMEDIDA_USUARIO_SIGLA')) return 'Ja existe uma unidade com esta sigla.'
  if (msg.includes('UQ_TIPOSMOVIMENTACAO_USUARIO_CODIGO')) return 'Ja existe um tipo com este codigo.'
  return 'Registro duplicado.'
}
