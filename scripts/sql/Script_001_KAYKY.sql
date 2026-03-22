-- ============================================================
-- SISTEMA DE ESTOQUE - SCHEMA COMPLETO (SQL Server Express)
-- Padrão de nomenclatura: português, prefixo por tabela
-- ============================================================

-- ============================================================
-- 1. CRIAR O BANCO DE DADOS
-- ============================================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SistemaEstoque')
BEGIN
    CREATE DATABASE SistemaEstoque;
END
GO

USE SistemaEstoque;
GO

-- ============================================================
-- TABELA: USUARIOS
-- Prefixo: USU
-- ============================================================
CREATE TABLE USUARIOS (
    USUIDUSUARIO        UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    USULOGIN            NVARCHAR(100)     NOT NULL UNIQUE,
    USUNOME             NVARCHAR(150)     NOT NULL,
    USUMAIL             NVARCHAR(200)     NULL,
    USUSENHAHASH        NVARCHAR(500)     NOT NULL,
    USUATIVO            BIT               NOT NULL DEFAULT 1,
    USUDATACADASTRO     DATETIME2         NOT NULL DEFAULT GETDATE(),
    USUDATAATUALIZACAO  DATETIME2         NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABELA: TIPOSMOVIMENTACAO
-- Prefixo: TIM
-- ============================================================
CREATE TABLE TIPOSMOVIMENTACAO (
    TIMIDTIPO               UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    TIMIDUSUARIOCADASTRO    UNIQUEIDENTIFIER  NOT NULL,
    TIMCODIGO               NVARCHAR(50)      NOT NULL,
    TIMDESCRICAO            NVARCHAR(200)     NOT NULL,
    TIMOPERACAO             CHAR(1)           NOT NULL,
    TIMEXIGEJUSTIFICATIVA   BIT               NOT NULL DEFAULT 0,
    TIMATIVO                BIT               NOT NULL DEFAULT 1,
    TIMDATACADASTRO         DATETIME2         NOT NULL DEFAULT GETDATE(),
    TIMDATAATUALIZACAO      DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_TIPOSMOVIMENTACAO_USUARIO  FOREIGN KEY (TIMIDUSUARIOCADASTRO) REFERENCES USUARIOS(USUIDUSUARIO) ON DELETE CASCADE,
    CONSTRAINT CK_TIPOSMOVIMENTACAO_OPERACAO CHECK (TIMOPERACAO IN ('+', '-')),
    CONSTRAINT UQ_TIPOSMOVIMENTACAO_USUARIO_CODIGO UNIQUE (TIMIDUSUARIOCADASTRO, TIMCODIGO)
);
GO

-- ============================================================
-- TABELA: CATEGORIAS
-- Prefixo: CAT
-- ============================================================
CREATE TABLE CATEGORIAS (
    CATIDCATEGORIA      UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    CATIDUSUARIOCADASTRO UNIQUEIDENTIFIER NOT NULL,
    CATNOME             NVARCHAR(100)     NOT NULL,
    CATATIVO            BIT               NOT NULL DEFAULT 1,
    CATDATACADASTRO     DATETIME2         NOT NULL DEFAULT GETDATE(),
    CATDATAATUALIZACAO  DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_CATEGORIAS_USUARIO FOREIGN KEY (CATIDUSUARIOCADASTRO) REFERENCES USUARIOS(USUIDUSUARIO) ON DELETE CASCADE,
    CONSTRAINT UQ_CATEGORIAS_USUARIO_NOME UNIQUE (CATIDUSUARIOCADASTRO, CATNOME)
);
GO

-- ============================================================
-- TABELA: PRODUTOS
-- Prefixo: PRO
-- ============================================================
CREATE TABLE PRODUTOS (
    PROIDPRODUTO         UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    PROIDUSUARIOCADASTRO UNIQUEIDENTIFIER  NOT NULL,
    PROIDCATEGORIA       UNIQUEIDENTIFIER  NULL,
    PRONOME              NVARCHAR(200)     NOT NULL,
    PROSKU               NVARCHAR(50)      NULL,
    PRODESCRICAO         NVARCHAR(500)     NULL,
    PROUNIDADE           NVARCHAR(10)      NOT NULL DEFAULT 'un',
    PROPRECOCUSTO        DECIMAL(10,2)     NULL,
    PROPRECOVENDA        DECIMAL(10,2)     NULL,
    PROESTOQUEATUAL      DECIMAL(10,3)     NOT NULL DEFAULT 0,
    PROESTOQUEMINIMO     DECIMAL(10,3)     NOT NULL DEFAULT 0,
    PROATIVO             BIT               NOT NULL DEFAULT 1,
    PRODATACADASTRO      DATETIME2         NOT NULL DEFAULT GETDATE(),
    PRODATAATUALIZACAO   DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_PRODUTOS_USUARIO   FOREIGN KEY (PROIDUSUARIOCADASTRO) REFERENCES USUARIOS(USUIDUSUARIO) ON DELETE CASCADE,
    CONSTRAINT FK_PRODUTOS_CATEGORIA FOREIGN KEY (PROIDCATEGORIA)       REFERENCES CATEGORIAS(CATIDCATEGORIA),
    CONSTRAINT UQ_PRODUTOS_USUARIO_SKU UNIQUE (PROIDUSUARIOCADASTRO, PROSKU)
);

CREATE INDEX IX_PRODUTOS_USUARIO   ON PRODUTOS(PROIDUSUARIOCADASTRO);
CREATE INDEX IX_PRODUTOS_CATEGORIA ON PRODUTOS(PROIDCATEGORIA);
CREATE INDEX IX_PRODUTOS_BAIXO     ON PRODUTOS(PROIDUSUARIOCADASTRO) WHERE PROATIVO = 1;
GO

-- ============================================================
-- TABELA: MOVIMENTACOES (imutável - sem data de atualização)
-- Prefixo: MOV
-- ============================================================
CREATE TABLE MOVIMENTACOES (
    MOVIDMOVIMENTACAO    UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    MOVIDUSUARIOCADASTRO UNIQUEIDENTIFIER  NOT NULL,
    MOVIDPRODUTO         UNIQUEIDENTIFIER  NOT NULL,
    MOVIDTIPO            UNIQUEIDENTIFIER  NOT NULL,
    MOVQUANTIDADE        DECIMAL(10,3)     NOT NULL,
    MOVJUSTIFICATIVA     NVARCHAR(500)     NULL,
    MOVTIPOREFERENCIA    NVARCHAR(50)      NULL,
    MOVIDREFERENCIA      UNIQUEIDENTIFIER  NULL,
    MOVOBSERVACAO        NVARCHAR(500)     NULL,
    MOVDATACADASTRO      DATETIME2         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_MOVIMENTACOES_USUARIO  FOREIGN KEY (MOVIDUSUARIOCADASTRO) REFERENCES USUARIOS(USUIDUSUARIO) ON DELETE CASCADE,
    CONSTRAINT FK_MOVIMENTACOES_PRODUTO  FOREIGN KEY (MOVIDPRODUTO)         REFERENCES PRODUTOS(PROIDPRODUTO),
    CONSTRAINT FK_MOVIMENTACOES_TIPO     FOREIGN KEY (MOVIDTIPO)            REFERENCES TIPOSMOVIMENTACAO(TIMIDTIPO),
    CONSTRAINT CK_MOVIMENTACOES_QTD      CHECK (MOVQUANTIDADE > 0)
);

CREATE INDEX IX_MOVIMENTACOES_PRODUTO      ON MOVIMENTACOES(MOVIDPRODUTO);
CREATE INDEX IX_MOVIMENTACOES_TIPO         ON MOVIMENTACOES(MOVIDTIPO);
CREATE INDEX IX_MOVIMENTACOES_USUARIO      ON MOVIMENTACOES(MOVIDUSUARIOCADASTRO);
CREATE INDEX IX_MOVIMENTACOES_DATACADASTRO ON MOVIMENTACOES(MOVDATACADASTRO DESC);
GO

-- ============================================================
-- TRIGGERS: atualizar DATAATUALIZACAO automaticamente
-- ============================================================

CREATE TRIGGER trg_TIPOSMOVIMENTACAO_atualizacao
ON TIPOSMOVIMENTACAO AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE TIPOSMOVIMENTACAO
    SET TIMDATAATUALIZACAO = GETDATE()
    FROM TIPOSMOVIMENTACAO t
    INNER JOIN inserted i ON t.TIMIDTIPO = i.TIMIDTIPO;
END;
GO

CREATE TRIGGER trg_CATEGORIAS_atualizacao
ON CATEGORIAS AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE CATEGORIAS
    SET CATDATAATUALIZACAO = GETDATE()
    FROM CATEGORIAS c
    INNER JOIN inserted i ON c.CATIDCATEGORIA = i.CATIDCATEGORIA;
END;
GO

CREATE TRIGGER trg_PRODUTOS_atualizacao
ON PRODUTOS AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE PRODUTOS
    SET PRODATAATUALIZACAO = GETDATE()
    FROM PRODUTOS p
    INNER JOIN inserted i ON p.PROIDPRODUTO = i.PROIDPRODUTO;
END;
GO

CREATE TRIGGER trg_USUARIOS_atualizacao
ON USUARIOS AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE USUARIOS
    SET USUDATAATUALIZACAO = GETDATE()
    FROM USUARIOS u
    INNER JOIN inserted i ON u.USUIDUSUARIO = i.USUIDUSUARIO;
END;
GO

-- ============================================================
-- TRIGGER: trg_processar_movimentacao
-- Valida e aplica a movimentação no estoque atomicamente
-- ============================================================

CREATE TRIGGER trg_processar_movimentacao
ON MOVIMENTACOES INSTEAD OF INSERT AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id                  UNIQUEIDENTIFIER;
    DECLARE @usuario_id          UNIQUEIDENTIFIER;
    DECLARE @produto_id          UNIQUEIDENTIFIER;
    DECLARE @tipo_id             UNIQUEIDENTIFIER;
    DECLARE @quantidade          DECIMAL(10,3);
    DECLARE @justificativa       NVARCHAR(500);
    DECLARE @tipo_referencia     NVARCHAR(50);
    DECLARE @id_referencia       UNIQUEIDENTIFIER;
    DECLARE @observacao          NVARCHAR(500);
    DECLARE @data_cadastro       DATETIME2;

    DECLARE @operacao            CHAR(1);
    DECLARE @exige_justificativa BIT;
    DECLARE @estoque_atual       DECIMAL(10,3);

    DECLARE mov_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT
            ISNULL(MOVIDMOVIMENTACAO, NEWID()),
            MOVIDUSUARIOCADASTRO,
            MOVIDPRODUTO,
            MOVIDTIPO,
            MOVQUANTIDADE,
            MOVJUSTIFICATIVA,
            MOVTIPOREFERENCIA,
            MOVIDREFERENCIA,
            MOVOBSERVACAO,
            ISNULL(MOVDATACADASTRO, GETDATE())
        FROM inserted;

    OPEN mov_cursor;
    FETCH NEXT FROM mov_cursor INTO
        @id, @usuario_id, @produto_id, @tipo_id,
        @quantidade, @justificativa, @tipo_referencia, @id_referencia,
        @observacao, @data_cadastro;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @operacao = TIMOPERACAO,
               @exige_justificativa = TIMEXIGEJUSTIFICATIVA
        FROM TIPOSMOVIMENTACAO
        WHERE TIMIDTIPO = @tipo_id;

        IF @exige_justificativa = 1 AND (LTRIM(RTRIM(ISNULL(@justificativa, ''))) = '')
        BEGIN
            RAISERROR('Justificativa obrigatória para este tipo de movimentação.', 16, 1);
            RETURN;
        END

        SELECT @estoque_atual = PROESTOQUEATUAL
        FROM PRODUTOS WITH (UPDLOCK, ROWLOCK)
        WHERE PROIDPRODUTO = @produto_id;

        IF @operacao = '-' AND @estoque_atual < @quantidade
        BEGIN
            DECLARE @msg NVARCHAR(500) = CONCAT(
                'Saldo insuficiente. Estoque atual: ', @estoque_atual,
                ', Quantidade solicitada: ', @quantidade
            );
            RAISERROR(@msg, 16, 1);
            RETURN;
        END

        INSERT INTO MOVIMENTACOES (
            MOVIDMOVIMENTACAO, MOVIDUSUARIOCADASTRO, MOVIDPRODUTO, MOVIDTIPO,
            MOVQUANTIDADE, MOVJUSTIFICATIVA, MOVTIPOREFERENCIA, MOVIDREFERENCIA,
            MOVOBSERVACAO, MOVDATACADASTRO
        )
        VALUES (
            @id, @usuario_id, @produto_id, @tipo_id,
            @quantidade, @justificativa, @tipo_referencia, @id_referencia,
            @observacao, @data_cadastro
        );

        UPDATE PRODUTOS
        SET PROESTOQUEATUAL = CASE
                WHEN @operacao = '+' THEN PROESTOQUEATUAL + @quantidade
                ELSE PROESTOQUEATUAL - @quantidade
            END,
            PRODATAATUALIZACAO = GETDATE()
        WHERE PROIDPRODUTO = @produto_id;

        FETCH NEXT FROM mov_cursor INTO
            @id, @usuario_id, @produto_id, @tipo_id,
            @quantidade, @justificativa, @tipo_referencia, @id_referencia,
            @observacao, @data_cadastro;
    END

    CLOSE mov_cursor;
    DEALLOCATE mov_cursor;
END;
GO

-- ============================================================
-- STORED PROCEDURE: sp_cancelar_movimentacao
-- Gera movimentação inversa para cancelar uma movimentação
-- ============================================================

CREATE PROCEDURE sp_cancelar_movimentacao
    @p_id_movimentacao   UNIQUEIDENTIFIER,
    @p_id_usuario        UNIQUEIDENTIFIER,
    @p_justificativa     NVARCHAR(500),
    @novo_id_movimentacao UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @produto_id      UNIQUEIDENTIFIER;
    DECLARE @tipo_id         UNIQUEIDENTIFIER;
    DECLARE @quantidade      DECIMAL(10,3);
    DECLARE @operacao        CHAR(1);
    DECLARE @tipo_inverso_id UNIQUEIDENTIFIER;

    SELECT @produto_id = MOVIDPRODUTO,
           @tipo_id    = MOVIDTIPO,
           @quantidade = MOVQUANTIDADE
    FROM MOVIMENTACOES
    WHERE MOVIDMOVIMENTACAO = @p_id_movimentacao
      AND MOVIDUSUARIOCADASTRO = @p_id_usuario;

    IF @produto_id IS NULL
    BEGIN
        RAISERROR('Movimentação não encontrada.', 16, 1);
        RETURN;
    END

    SELECT @operacao = TIMOPERACAO
    FROM TIPOSMOVIMENTACAO
    WHERE TIMIDTIPO = @tipo_id;

    SELECT TOP 1 @tipo_inverso_id = TIMIDTIPO
    FROM TIPOSMOVIMENTACAO
    WHERE TIMIDUSUARIOCADASTRO = @p_id_usuario
      AND TIMATIVO = 1
      AND TIMOPERACAO = CASE WHEN @operacao = '+' THEN '-' ELSE '+' END
      AND TIMCODIGO IN ('AJUSTE_NEG', 'AJUSTE_POS', 'CANCELAMENTO')
    ORDER BY
        CASE TIMCODIGO
            WHEN 'CANCELAMENTO' THEN 0
            WHEN 'AJUSTE_NEG'   THEN 1
            WHEN 'AJUSTE_POS'   THEN 1
            ELSE 2
        END;

    IF @tipo_inverso_id IS NULL
    BEGIN
        RAISERROR('Nenhum tipo de movimentação inversa disponível.', 16, 1);
        RETURN;
    END

    SET @novo_id_movimentacao = NEWID();

    INSERT INTO MOVIMENTACOES (
        MOVIDMOVIMENTACAO, MOVIDUSUARIOCADASTRO, MOVIDPRODUTO, MOVIDTIPO,
        MOVQUANTIDADE, MOVJUSTIFICATIVA, MOVTIPOREFERENCIA, MOVIDREFERENCIA
    )
    VALUES (
        @novo_id_movimentacao,
        @p_id_usuario,
        @produto_id,
        @tipo_inverso_id,
        @quantidade,
        ISNULL(@p_justificativa, CONCAT('Cancelamento da movimentação ', CAST(@p_id_movimentacao AS NVARCHAR(50)))),
        'cancelamento',
        @p_id_movimentacao
    );
END;
GO

-- ============================================================
-- VIEW: Produtos com estoque baixo
-- ============================================================

CREATE VIEW vw_estoque_baixo AS
SELECT
    p.PROIDPRODUTO,
    p.PROIDUSUARIOCADASTRO,
    p.PROSKU,
    p.PRONOME,
    p.PROESTOQUEATUAL,
    p.PROESTOQUEMINIMO,
    p.PROPRECOCUSTO,
    p.PROPRECOVENDA,
    c.CATNOME AS CATEGORIA
FROM PRODUTOS p
LEFT JOIN CATEGORIAS c ON c.CATIDCATEGORIA = p.PROIDCATEGORIA
WHERE p.PROATIVO = 1
  AND p.PROESTOQUEATUAL <= p.PROESTOQUEMINIMO;
GO

-- ============================================================
-- VIEW: Histórico de movimentações detalhado
-- ============================================================

CREATE VIEW vw_movimentacoes AS
SELECT
    m.MOVIDMOVIMENTACAO,
    m.MOVIDUSUARIOCADASTRO,
    m.MOVDATACADASTRO,
    p.PRONOME          AS PRODUTO,
    p.PROSKU,
    t.TIMCODIGO        AS TIPO_CODIGO,
    t.TIMDESCRICAO     AS TIPO_DESCRICAO,
    t.TIMOPERACAO      AS OPERACAO,
    m.MOVQUANTIDADE    AS QUANTIDADE,
    m.MOVJUSTIFICATIVA AS JUSTIFICATIVA,
    m.MOVTIPOREFERENCIA,
    m.MOVIDREFERENCIA,
    m.MOVOBSERVACAO
FROM MOVIMENTACOES m
INNER JOIN PRODUTOS          p ON p.PROIDPRODUTO = m.MOVIDPRODUTO
INNER JOIN TIPOSMOVIMENTACAO t ON t.TIMIDTIPO    = m.MOVIDTIPO;
GO

-- ============================================================
-- DADOS INICIAIS: usuário suporte
-- ============================================================
DECLARE @uid_suporte UNIQUEIDENTIFIER = NEWID();

INSERT INTO USUARIOS (USUIDUSUARIO, USULOGIN, USUNOME, USUSENHAHASH, USUATIVO)
VALUES (
    @uid_suporte,
    'suporte',
    'Suporte',
    '$2b$10$6QnUIo4pbhjm1kn5kBIHH.j2Yk6OfWY6gL2KVC.4hZs1GNvS047di',
    1
);

-- ============================================================
-- DADOS INICIAIS: tipos de movimentação padrão (vinculados ao suporte)
-- ============================================================
INSERT INTO TIPOSMOVIMENTACAO (TIMIDUSUARIOCADASTRO, TIMCODIGO, TIMDESCRICAO, TIMOPERACAO, TIMEXIGEJUSTIFICATIVA) VALUES
    (@uid_suporte, 'COMPRA',       'Entrada por compra',           '+', 0),
    (@uid_suporte, 'VENDA',        'Saída por venda',              '-', 0),
    (@uid_suporte, 'AJUSTE_POS',   'Ajuste positivo de estoque',   '+', 1),
    (@uid_suporte, 'AJUSTE_NEG',   'Ajuste negativo de estoque',   '-', 1),
    (@uid_suporte, 'PERDA',        'Perda / avaria',               '-', 1),
    (@uid_suporte, 'CANCELAMENTO', 'Cancelamento de movimentação', '+', 1);

PRINT '============================================';
PRINT ' SistemaEstoque criado com sucesso!';
PRINT ' Usuário suporte e tipos de movimentação inseridos.';
PRINT '============================================';
GO
