# 📙 Caderneta — Minhas Finanças (Full Stack)

Aplicativo de finanças pessoais com sistema de envelopes, controle mensal de sobra/déficit, extrato dinâmico e autenticação de usuários (login e registro com código por e-mail).

## 🚀 Como executar localmente

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm
- Uma instância MongoDB acessível

### Instalar dependências
Na raiz do projeto:
```bash
npm run install:all
```

### Iniciar o servidor
```bash
npm run dev --prefix server
```
O servidor roda em `http://localhost:4000`.

### Iniciar o cliente
Em outro terminal:
```bash
npm run dev --prefix client
```
Abra `http://localhost:3000` no navegador. O Vite encaminha as chamadas `/api` para o servidor local.

## 🧪 Validação

Os comandos abaixo são executados sem necessidade de MongoDB, Brevo ou Render:
```bash
npm test --prefix server
npm run build --prefix client
npm run build
```

## 🛠️ Arquitetura e tecnologias

- **Cliente (`client`):** React 18, Vite, Tailwind CSS e Lucide Icons. A camada `src/services/api.js` concentra requests HTTP; `src/context` mantém autenticação, e `src/hooks/useDashboardData.js` concentra o estado e as mutações do dashboard.
- **Servidor (`server`):** Node.js, Express, JWT e bcryptjs. O código é organizado em configuração, rotas, controllers, services, validadores e middleware de erros; `src/index.js` inicia a conexão e o processo, enquanto `src/app.js` monta a aplicação.
- **Banco:** MongoDB, configurado pela variável `MONGODB_URI`.
- **Cadastro e autenticação por e-mail:** Brevo, configurado pelas variáveis `SENDER_EMAIL` e `BREVO_API_KEY`.
- **Sessão:** o segredo JWT é lido de `JWT_SECRET`. Não coloque credenciais ou segredos no repositório.

## 🌐 Deploy

A aplicação é hospedada no Render. O processo do servidor serve o build de `client/dist` em produção; configure no ambiente do Render as variáveis `MONGODB_URI`, `JWT_SECRET`, `SENDER_EMAIL` e `BREVO_API_KEY` antes de iniciar o serviço.
