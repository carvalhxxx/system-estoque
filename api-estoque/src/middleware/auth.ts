import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Extende o Request do Express para incluir o userId
export interface AuthRequest extends Request {
  userId?: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'troque-por-uma-chave-secreta'

/**
 * Middleware de autenticação JWT.
 * Extrai o token do header Authorization: Bearer <token>
 * e injeta req.userId para as rotas usarem.
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido.' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' })
  }
}

/**
 * Gera um token JWT para o usuário.
 */
export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  } as jwt.SignOptions)
}
