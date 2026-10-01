# 📙 Caderneta — Minhas Finanças (Full Stack)

Aplicativo completo de finanças pessoais com sistema de envelopes, controle mensal de sobra/déficit, extrato dinâmico e autenticação de usuários (Login & Registro).

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn

### 1. Iniciar o Servidor (Backend API)
```bash
cd server
npm install
npm run dev
```
O servidor rodará em `http://localhost:4000`.

### 2. Iniciar o Cliente (Frontend React)
Em outro terminal:
```bash
cd client
npm install
npm run dev
```
Abra `http://localhost:3000` no seu navegador!

---

## 🛠️ Tecnologias Utilizadas
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Roboto Slab typography.
- **Backend:** Node.js, Express, JWT (JSON Web Tokens), bcryptjs para hash seguro de senhas.
- **Banco de Dados:** Banco local JSON auto-criado em `server/data.json` (fácil de substituir por PostgreSQL, SQLite ou MongoDB).

## 🌐 Opções de Hospedagem
- **Vercel / Netlify:** Para hospedar o `client`.
- **Render / Railway / Fly.io:** Para hospedar o `server`.
- **Docker:** Inclui suporte a conteinerização para deploy rápido em VPS.
