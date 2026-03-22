-- ============================================================
-- SISTEMA DE ESTOQUE - CONFIGURAÇÃO DE AUTENTICAÇÃO SQL SERVER
-- Habilita modo misto (Windows + SQL) e configura login sa
-- Pré-requisito: Script_001_KAYKY.sql executado
-- ============================================================

-- ============================================================
-- 1. HABILITAR AUTENTICAÇÃO MISTA (Windows + SQL Server)
-- Necessário para conectar via TCP com user/password
-- ============================================================
USE master;
GO

EXEC xp_instance_regwrite
    N'HKEY_LOCAL_MACHINE',
    N'Software\Microsoft\MSSQLServer\MSSQLServer',
    N'LoginMode',
    REG_DWORD,
    2;
GO

-- ============================================================
-- 2. HABILITAR E CONFIGURAR O LOGIN sa
-- ============================================================
ALTER LOGIN sa ENABLE;
GO

-- Troque a senha abaixo pela senha definida no seu .env (DB_PASSWORD)
ALTER LOGIN sa WITH PASSWORD = 'kay5771';
GO

-- ============================================================
-- 3. GARANTIR QUE O sa TEM ACESSO AO BANCO
-- ============================================================
USE SistemaEstoque;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.database_principals WHERE name = 'sa'
)
BEGIN
    CREATE USER sa FOR LOGIN sa;
END
GO

ALTER ROLE db_owner ADD MEMBER sa;
GO

-- ============================================================
-- IMPORTANTE: Após executar este script, reinicie o serviço
-- SQL Server (SQLEXPRESS) para aplicar o modo de autenticação:
--
--   PowerShell (Admin): Restart-Service 'MSSQL$SQLEXPRESS'
--
-- .env necessário:
--   DB_SERVER=localhost
--   DB_PORT=1435
--   DB_DATABASE=SistemaEstoque
--   DB_TRUSTED_CONNECTION=false
--   DB_USER=sa
--   DB_PASSWORD=SUA_SENHA_AQUI
-- ============================================================

PRINT '============================================';
PRINT ' Autenticação SQL configurada com sucesso!';
PRINT ' Reinicie o serviço SQLEXPRESS para aplicar.';
PRINT '============================================';
GO
