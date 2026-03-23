import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'

// Mock database antes de importar app
vi.mock('../config/database', () => {
  const mockRecordset: Record<string, unknown>[] = []
  const mockRowsAffected = [0]

  const mockRequest = {
    input: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    query: vi.fn().mockResolvedValue({ recordset: mockRecordset, rowsAffected: mockRowsAffected }),
    execute: vi.fn().mockResolvedValue({ recordset: mockRecordset, output: {} }),
  }

  const mockPool = {
    request: () => mockRequest,
    transaction: () => ({
      begin: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      request: () => mockRequest,
    }),
  }

  return {
    getPool: vi.fn().mockResolvedValue(mockPool),
    sql: {
      UniqueIdentifier: 'UniqueIdentifier',
      NVarChar: 'NVarChar',
      Int: 'Int',
      Bit: 'Bit',
      Char: vi.fn(() => 'Char'),
      Decimal: vi.fn(() => 'Decimal'),
      DateTime2: 'DateTime2',
    },
    _mockRequest: mockRequest,
    _mockRecordset: mockRecordset,
  }
})

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

// Set JWT_SECRET before importing app
process.env.JWT_SECRET = 'test-secret-for-unit-tests'

import app from '../app'
import { _mockRequest, _mockRecordset } from '../config/database'

const mockRequest = _mockRequest as ReturnType<typeof vi.fn> & {
  input: ReturnType<typeof vi.fn>
  query: ReturnType<typeof vi.fn>
}
const mockRecordset = _mockRecordset as Record<string, unknown>[]

describe('Auth Routes', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 if login or senha is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'test' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('should return 401 if user not found', async () => {
      mockRequest.query.mockResolvedValueOnce({ recordset: [], rowsAffected: [0] })

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'nonexistent', senha: 'password' })

      expect(res.status).toBe(401)
    })

    it('should return token on successful login', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{
          USUIDUSUARIO: '123e4567-e89b-12d3-a456-426614174000',
          USULOGIN: 'admin',
          USUNOME: 'Admin',
          USUSENHAHASH: '$2b$10$hashedpassword',
        }],
        rowsAffected: [1],
      })

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ login: 'admin', senha: 'password123' })

      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.user).toBeDefined()
      expect(res.body.user.login).toBe('admin')
    })
  })

  describe('POST /api/v1/auth/register', () => {
    it('should return 400 if fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ login: 'test' })

      expect(res.status).toBe(400)
    })

    it('should return 409 if login already exists', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{ USUIDUSUARIO: '123' }],
        rowsAffected: [1],
      })

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ login: 'existing', nome: 'User', senha: 'password123' })

      expect(res.status).toBe(409)
    })

    it('should create user and return token', async () => {
      // First query: check existing - returns empty
      mockRequest.query.mockResolvedValueOnce({ recordset: [], rowsAffected: [0] })
      // Second query: insert - returns new user
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{
          USUIDUSUARIO: '223e4567-e89b-12d3-a456-426614174000',
          USULOGIN: 'newuser',
          USUNOME: 'New User',
          USUDATACADASTRO: new Date().toISOString(),
        }],
        rowsAffected: [1],
      })

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ login: 'newuser', nome: 'New User', senha: 'password123' })

      expect(res.status).toBe(201)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.login).toBe('newuser')
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me')
      expect(res.status).toBe(401)
    })

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')

      expect(res.status).toBe(401)
    })
  })

  describe('PUT /api/v1/auth/password', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .put('/api/v1/auth/password')
        .send({ senhaAtual: 'old', novaSenha: 'newpass' })

      expect(res.status).toBe(401)
    })
  })
})
