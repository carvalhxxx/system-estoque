-- ============================================================
-- SCRIPT 003 - Tabela UNIDADESMEDIDA + FK em PRODUTOS
-- ============================================================

USE SistemaEstoque;
GO

-- ============================================================
-- TABELA: UNIDADESMEDIDA
-- Prefixo: UNI
-- ============================================================
CREATE TABLE UNIDADESMEDIDA (
    UNIIDUNIDADE         UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    UNIIDUSUARIOCADASTRO UNIQUEIDENTIFIER  NOT NULL,
    UNISIGLA             NVARCHAR(10)      NOT NULL,
    UNIDESCRICAO         NVARCHAR(100)     NOT NULL,
    UNIATIVO             BIT               NOT NULL DEFAULT 1,
    UNIDATACADASTRO      DATETIME2         NOT NULL DEFAULT GETDATE(),
    UNIDATAATUALIZACAO   DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_UNIDADESMEDIDA_USUARIO FOREIGN KEY (UNIIDUSUARIOCADASTRO) REFERENCES USUARIOS(USUIDUSUARIO) ON DELETE CASCADE,
    CONSTRAINT UQ_UNIDADESMEDIDA_USUARIO_SIGLA UNIQUE (UNIIDUSUARIOCADASTRO, UNISIGLA)
);
GO

-- ── Trigger de atualização ──────────────────────────────────
CREATE TRIGGER trg_UNIDADESMEDIDA_atualizacao
ON UNIDADESMEDIDA AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE UNIDADESMEDIDA
    SET UNIDATAATUALIZACAO = GETDATE()
    FROM UNIDADESMEDIDA u
    INNER JOIN inserted i ON u.UNIIDUNIDADE = i.UNIIDUNIDADE;
END;
GO

-- ============================================================
-- Adicionar coluna FK em PRODUTOS (substituir texto livre)
-- ============================================================

-- 1. Nova coluna de FK
ALTER TABLE PRODUTOS
    ADD PROIDUNIDADE UNIQUEIDENTIFIER NULL;
GO

-- 2. FK
ALTER TABLE PRODUTOS
    ADD CONSTRAINT FK_PRODUTOS_UNIDADE FOREIGN KEY (PROIDUNIDADE) REFERENCES UNIDADESMEDIDA(UNIIDUNIDADE);
GO

-- ============================================================
-- DADOS INICIAIS: unidades padrão (vinculadas ao suporte)
-- ============================================================
DECLARE @uid_suporte UNIQUEIDENTIFIER;
SELECT @uid_suporte = USUIDUSUARIO FROM USUARIOS WHERE USULOGIN = 'suporte';

INSERT INTO UNIDADESMEDIDA (UNIIDUSUARIOCADASTRO, UNISIGLA, UNIDESCRICAO) VALUES
    (@uid_suporte, 'un',  'Unidade'),
    (@uid_suporte, 'kg',  'Quilograma'),
    (@uid_suporte, 'g',   'Grama'),
    (@uid_suporte, 'lt',  'Litro'),
    (@uid_suporte, 'ml',  'Mililitro'),
    (@uid_suporte, 'mt',  'Metro'),
    (@uid_suporte, 'cm',  'Centímetro'),
    (@uid_suporte, 'cx',  'Caixa'),
    (@uid_suporte, 'pc',  'Peça'),
    (@uid_suporte, 'pct', 'Pacote'),
    (@uid_suporte, 'par', 'Par');

-- ============================================================
-- Migrar dados existentes: converter PROUNIDADE texto para FK
-- ============================================================
UPDATE p
SET p.PROIDUNIDADE = u.UNIIDUNIDADE
FROM PRODUTOS p
INNER JOIN UNIDADESMEDIDA u
    ON u.UNISIGLA = p.PROUNIDADE
    AND u.UNIIDUSUARIOCADASTRO = p.PROIDUSUARIOCADASTRO;
GO

-- 3. Remover coluna texto antiga (opcional — rodar após validar migração)
-- ALTER TABLE PRODUTOS DROP COLUMN PROUNIDADE;
-- GO

PRINT '============================================';
PRINT ' Script 003 executado com sucesso!';
PRINT ' Tabela UNIDADESMEDIDA criada.';
PRINT ' FK PROIDUNIDADE adicionada em PRODUTOS.';
PRINT '============================================';
GO
