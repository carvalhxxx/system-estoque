# Configuração do SQL Server Express para o Sistema de Estoque

Passos necessários para preparar o ambiente antes de rodar a API.
Execute na ordem abaixo.

---

## 1. Habilitar TCP/IP no SQL Server Configuration Manager

O SQL Server Express vem com TCP/IP desativado por padrão. Sem isso, a API não consegue conectar.

1. Pressione `Win + R` e execute:
   ```
   SQLServerManager16.msc
   ```
2. No painel esquerdo, acesse:
   `SQL Server Network Configuration` → `Protocols for SQLEXPRESS`

3. Clique com botão direito em **TCP/IP** → **Enable**

4. Duplo clique em **TCP/IP** → aba **IP Addresses**

5. Role até o final até a seção **IPAll**:
   - **TCP Dynamic Ports**: apague o valor (deixe vazio)
   - **TCP Port**: `1435`

6. Clique **OK**

> **Por que 1435?** A instância padrão (MSSQLSERVER) é configurada para usar a 1433.
> Usar 1435 no SQLEXPRESS evita conflito caso as duas instâncias estejam ativas.

---

## 2. Habilitar Autenticação Mista

Por padrão o SQL Server Express aceita apenas autenticação Windows.
Para conectar via TCP com usuário e senha (necessário para o driver `mssql`/tedious),
é preciso habilitar o modo misto.

Execute o **Script_002_KAYKY.sql** no SSMS conectado ao SQLEXPRESS.

O script faz:
- Habilita autenticação mista via `xp_instance_regwrite`
- Habilita o login `sa` e define a senha
- Garante que o `sa` tem acesso ao banco `SistemaEstoque`

---

## 3. Reiniciar o serviço SQLEXPRESS

As mudanças de TCP e modo de autenticação só entram em vigor após reiniciar o serviço.

**PowerShell (como Administrador):**
```powershell
Restart-Service 'MSSQL$SQLEXPRESS'
```

**Ou pelo próprio Configuration Manager:**
`SQL Server Services` → botão direito em **SQL Server (SQLEXPRESS)** → **Restart**

---

## 4. Configurar o .env da API

O arquivo `api-estoque/.env` deve conter:

```env
PORT=3001

DB_SERVER=localhost
DB_PORT=1435
DB_DATABASE=SistemaEstoque
DB_TRUSTED_CONNECTION=false
DB_USER=sa
DB_PASSWORD=sua_senha_aqui

JWT_SECRET=chave-secreta-longa-aqui
JWT_EXPIRES_IN=7d

CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 5. Criar o banco de dados

Execute o **Script_001_KAYKY.sql** no SSMS para criar as tabelas, triggers, stored procedures e views.

---

## Ordem de execução resumida

| Passo | O que fazer |
|---|---|
| 1 | SQL Server Configuration Manager → habilitar TCP/IP → porta 1435 |
| 2 | SSMS → executar `Script_001_KAYKY.sql` (cria o banco) |
| 3 | SSMS → executar `Script_002_KAYKY.sql` (configura autenticação) |
| 4 | PowerShell admin → `Restart-Service 'MSSQL$SQLEXPRESS'` |
| 5 | Criar/configurar `api-estoque/.env` |
| 6 | `npm run dev` na pasta `api-estoque` |
