# FAPG Backend

API backend para o sistema FAPG de gerenciamento de projetos, usuários, atividades, documentos, entre outros recursos administrativos.

---

## 🚀 Como rodar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/Byte-Benders-Fatec/api-1sem-2025-backend-2.git
```

### 2. Acesse a pasta do projeto

```bash
cd backend
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Em seguida, edite o arquivo `.env` e altere os valores conforme seu ambiente atual (ex: conexão com banco de dados, JWT, porta etc).

---

### 4. Instale as dependências

```bash
npm install
```

---

### 5. Rode o servidor

```bash
npm run dev
```

O backend será iniciado e ficará disponível na porta configurada no `.env`, por exemplo: [http://localhost:5000](http://localhost:5000)
