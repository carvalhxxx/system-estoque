import sql from 'mssql'
import dotenv from 'dotenv'

dotenv.config()

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
  database: process.env.DB_DATABASE || 'SistemaEstoque',
  options: {
    encrypt: process.env.NODE_ENV === 'production',
    trustServerCertificate: process.env.NODE_ENV !== 'production',
    enableArithAbort: true,
  },
  // Se DB_TRUSTED_CONNECTION=true, usa autenticação Windows
  // Senão, usa user/password
  ...(process.env.DB_TRUSTED_CONNECTION === 'true'
    ? {
        authentication: {
          type: 'ntlm',
          options: {
            domain: '',
            userName: '',
            password: '',
          },
        },
        // No Windows com trusted connection, o mssql usa as credenciais do processo
        // Basta não passar user/password
      }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

// Pool de conexão singleton
let pool: sql.ConnectionPool | null = null

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config)
    console.log('✅ Conectado ao SQL Server:', process.env.DB_DATABASE)
  }
  return pool
}

export { sql }
