# Plano de implementação — refatoração sustentável da Caderneta

## Decisões e premissas

1. **Manter JavaScript/CommonJS no servidor e JavaScript/JSX + React/Vite no cliente.** Os manifests atuais não usam TypeScript nem framework de testes; a refatoração não deve introduzir migração de linguagem ou framework.
2. **Extrair a criação da aplicação Express de `server/src/index.js`.** `app.js` poderá ser importado sem abrir uma porta, enquanto `index.js` ficará responsável somente por carregar configuração, conectar ao MongoDB e iniciar o servidor. Isso reduz acoplamento e torna as rotas testáveis sem executar o processo HTTP.
3. **Usar routers, controllers, services e middleware reutilizável, sem reescrever o domínio.** Os modelos existentes em `server/src/db.js` podem continuar sendo a fonte dos modelos Mongoose; a divisão deve remover responsabilidades do ponto de entrada, não criar uma camada de abstração sem uso.
4. **Centralizar configuração sem alterar ainda a política de sessão.** Criar um módulo único para `PORT`, `JWT_SECRET`, `SENDER_EMAIL`, `BREVO_API_KEY`, caminho do frontend e demais variáveis usadas. Para preservar o funcionamento local atual, o fallback JWT e o TTL de sete dias não serão endurecidos nesta refatoração; a remoção do fallback e a migração para sessão mais segura ficam registradas como pendências de segurança.
5. **Adicionar validação server-side explícita para entradas inválidas sem alterar os payloads válidos da UI.** A validação reutilizável deve normalizar e-mail, exigir tipos/formato, limitar parcelas a 48 (limite já exposto no dashboard), aceitar somente tipos/categorias conhecidas e validar o mapa de orçamento; os erros devem virar respostas JSON 400 uniformes.
6. **Não adicionar dependência de teste.** O servidor já é CommonJS e roda com Node 18+; `node:test` nativo é a alternativa mínima. O teste representativo cobrirá a lógica pura de parcelamento/datas, sem MongoDB, Brevo, Render ou rede.
7. **Extrair a comunicação HTTP do frontend e o estado do dashboard.** Uma camada `client/src/services/api.js` concentrará parsing de JSON, erros e cabeçalho Bearer; um hook de dashboard concentrará carregamento e mutações. A UI continuará usando as mesmas rotas, payloads, armazenamento local e categorias.

## Contratos que devem permanecer idênticos

- `POST /api/auth/send-code`: recebe `{ email }` e mantém respostas de sucesso `{ success: true, message }` e os textos de erro existentes quando aplicáveis.
- `POST /api/auth/register`: recebe `{ name, email, password, code }` e retorna `{ user: { id, name, email }, token }`.
- `POST /api/auth/login`: recebe `{ email, password }` e retorna `{ user: { id, name, email }, token }`; falha de credenciais continua HTTP 401.
- `GET /api/auth/me`: exige `Authorization: Bearer <token>` e retorna `{ user: { id, name, email } }`.
- `GET /api/transactions`: exige autenticação e retorna a lista com `id`, `userId`, `groupId`, `description`, `amount`, `type`, `category` e `date`.
- `POST /api/transactions`: recebe os campos atuais e `installments` opcional; retorna HTTP 201 com a lista de lançamentos criados, preservando parcelamento mensal, descrição `(n/total)` e datas ajustadas ao último dia do mês.
- `DELETE /api/transactions/:id`: mantém HTTP 404 para lançamento ausente e `{ success: true }` no sucesso.
- `GET /api/budgets` e `PUT /api/budgets`: continuam autenticados; o GET retorna o mapa de limites ou `{}`, e o PUT recebe o mapa JSON e retorna o mapa persistido.
- O frontend continua enviando o JWT em `localStorage` nas chaves `caderneta_token` e `caderneta_user`, sem mudança de contrato nesta etapa.
- O serving de `client/dist` e o fallback SPA continuam no processo de produção; nenhum arquivo de Render, Docker, Compose ou configuração operacional será alterado.

## Pendências de segurança fora de escopo

Estas questões foram confirmadas na auditoria, mas não serão implementadas às pressas como parte da refatoração estrutural: remover fallback/previsibilidade do `JWT_SECRET` e rotacionar segredos já expostos; migrar JWT de `localStorage` para cookie HttpOnly/Secure/SameSite com CSRF, rotação e revogação; rate limiting/cooldown contra brute force, spam de Brevo e cadastro; trocar `Math.random()` por `crypto.randomInt` e tornar o consumo do código atômico; endurecer limites de body, política CORS por allowlist e headers de segurança; timeouts/retries/circuit breaker do Brevo; logger estruturado com redaction, observabilidade e health/readiness; transações/bulk write e política de arredondamento financeiro; lockfiles, auditoria de dependências e ajustes reais de Render/MongoDB/Brevo. A centralização da leitura do segredo e a validação básica de entradas são as únicas partes relacionadas que entram naturalmente nesta refatoração.

## Implementação ordenada

- [ ] 1. Criar a configuração centralizada e separar a inicialização Express do bootstrap do servidor.
      Criar `server/src/config/env.js` para carregar `dotenv` e expor a configuração usada hoje; criar `server/src/app.js` para montar `express.json()`, CORS atual, routers, arquivos estáticos e fallback SPA; reduzir `server/src/index.js` a bootstrap de conexão/listen e exportar a aplicação apenas quando necessário. O módulo de configuração deve manter o fallback JWT e o `expiresIn: '7d'` atuais, deixando o endurecimento como pendência.
      **Arquivos:** criar `server/src/config/env.js`, `server/src/app.js`; modificar `server/src/index.js`.
      **Verificar:** `npm run build` na raiz — o comando deve instalar os pacotes declarados e concluir o build Vite sem erro; `npm start --prefix server` não deve iniciar uma segunda lógica de rotas fora de `app.js` (interromper após confirmar o boot local sem alterar infraestrutura).

- [ ] 2. Dividir as rotas backend por domínio e mover autenticação, Brevo, transações e orçamentos para controllers/services.
      Criar routers em `server/src/routes/authRoutes.js`, `transactionRoutes.js` e `budgetRoutes.js`; criar controllers correspondentes e services para as regras de autenticação/e-mail, transações/parcelamento e orçamento, reutilizando `User`, `Transaction`, `Budget` e `VerificationCode` de `server/src/db.js`. Os controllers devem conservar exatamente os caminhos, métodos, status, formatos de resposta e filtro por `req.userId` listados acima.
      **Arquivos:** criar `server/src/routes/authRoutes.js`, `server/src/routes/transactionRoutes.js`, `server/src/routes/budgetRoutes.js`, `server/src/controllers/authController.js`, `transactionController.js`, `budgetController.js`, `server/src/services/authService.js`, `emailService.js`, `transactionService.js`, `budgetService.js`; modificar `server/src/index.js`/`server/src/app.js` conforme a montagem das rotas.
      **Verificar:** `npm run build` na raiz e `npm test --prefix server` — o build deve passar e o conjunto de testes deve continuar executável; revisar manualmente que cada rota original tem um único registro no router correspondente.

- [ ] 3. Centralizar validação, erros assíncronos e respostas de erro sem mudar respostas válidas.
      Criar `server/src/errors/AppError.js`, `server/src/middleware/asyncHandler.js`, `server/src/middleware/errorHandler.js` e validadores reutilizáveis em `server/src/validators/`. Cobrir e-mail/nome/senha/código, payload de transação (incluindo parcelas entre 1 e 48, valor finito positivo, tipo, categoria e data ISO válida) e orçamento como mapa simples de limites numéricos; mapear falhas de validação Mongoose, duplicidade e ObjectId inválido para JSON controlado. Atualizar `server/src/middleware/auth.js` para importar o segredo da configuração central e rejeitar cabeçalho Bearer malformado sem lançar erro não tratado.
      **Arquivos:** criar `server/src/errors/AppError.js`, `server/src/middleware/asyncHandler.js`, `server/src/middleware/errorHandler.js`, `server/src/validators/authValidator.js`, `transactionValidator.js`, `budgetValidator.js`; modificar `server/src/middleware/auth.js` e controllers/services.
      **Verificar:** `npm test --prefix server` — testes de validação e parcelamento passam; `npm run build` na raiz — o bundle frontend continua compilando; não alterar respostas/status para payloads válidos.

- [ ] 4. Extrair a lógica pura de parcelamento e criar o teste automatizado representativo com `node:test`.
      Manter em `server/src/services/transactionService.js` uma função pura exportável que calcule datas mensais e valores/descrições dos lançamentos, preservando o comportamento atual para meses curtos e parcelas. Criar `server/test/transactionService.test.js` usando `node:test` e `node:assert/strict`, cobrindo uma compra parcelada que cruza fevereiro/mês curto, a descrição numerada e a rejeição do limite inválido; não conectar a MongoDB/Brevo.
      **Arquivos:** criar `server/test/transactionService.test.js`; modificar `server/src/services/transactionService.js` e `server/package.json` com o script `"test": "node --test"`.
      **Verificar:** `npm test --prefix server` — todos os testes passam e falham se o cálculo de data/parcelas ou limite for quebrado; executar também `node --test server/test/transactionService.test.js` a partir da raiz como confirmação direta.

- [ ] 5. Criar uma camada HTTP frontend e concentrar o fluxo de autenticação nela.
      Criar `client/src/services/api.js` com request JSON, inclusão opcional de `Authorization`, conversão consistente de erros e funções para auth/transações/orçamentos. Atualizar `client/src/context/AuthContext.jsx` para usar o serviço, manter as chaves atuais de `localStorage`, hidratar `/api/auth/me` e aceitar o código no método de registro; atualizar `client/src/pages/AuthPage.jsx` para chamar `register` do contexto em vez de duplicar `fetch` e persistência, preservando as duas etapas e textos/estados visíveis.
      **Arquivos:** criar `client/src/services/api.js`; modificar `client/src/context/AuthContext.jsx` e `client/src/pages/AuthPage.jsx`.
      **Verificar:** `npm run build --prefix client` — o build Vite conclui sem erro; `npm test --prefix server` — a mudança frontend não quebra o teste automatizado do projeto.

- [ ] 6. Extrair o estado/mutações do dashboard para hook e utilitários, mantendo a apresentação e os contratos.
      Criar `client/src/hooks/useDashboardData.js` para carregar transações/orçamentos e expor refresh, criação, exclusão e atualização de orçamento através de `api.js`; criar `client/src/constants/finance.js` para categorias existentes e `client/src/utils/finance.js` para formatação/cálculos puros usados pelo dashboard. Refatorar `client/src/pages/DashboardPage.jsx` para consumir essas unidades, sem alterar nomes de categorias, payloads, filtro mensal, parcelamento ou comportamento visual; tratar apenas erros de request de modo compatível com o mecanismo centralizado.
      **Arquivos:** criar `client/src/hooks/useDashboardData.js`, `client/src/constants/finance.js`, `client/src/utils/finance.js`; modificar `client/src/pages/DashboardPage.jsx`.
      **Verificar:** `npm run build --prefix client` e `npm test --prefix server` — ambos passam; confirmar no build que não há imports JSX/ESM quebrados.

- [ ] 7. Documentar a arquitetura real e os comandos de validação sem alterar infraestrutura.
      Atualizar `README.md` para corrigir a referência obsoleta a banco JSON, documentar Render/MongoDB/Brevo apenas por nomes de variáveis (`MONGODB_URI`, `JWT_SECRET`, `SENDER_EMAIL`, `BREVO_API_KEY`), explicar a divisão client/server e registrar `npm test --prefix server` e `npm run build` como validações. Não criar Dockerfile, `render.yaml`, Compose, lockfile ou segredo.
      **Arquivos:** modificar `README.md`.
      **Verificar:** `npm test --prefix server`, `npm run build` e `npm run build --prefix client` — testes e build passam; a documentação contém os comandos que acabaram de ser executados e nenhuma credencial.

- [ ] 8. Executar a validação final de integração e registrar limitações.
      Rodar o teste nativo do servidor e o build completo da aplicação, revisar o diff para garantir que nenhuma rota/contrato foi removido e que nenhum arquivo de infraestrutura foi alterado. Registrar no resultado final as pendências de segurança acima, especialmente JWT/localStorage/rate limiting/CORS, sem implementá-las nesta tarefa.
      **Arquivos:** somente os arquivos dos itens 1–7.
      **Verificar:** `npm test --prefix server` e `npm run build` na raiz — ambos terminam com sucesso; revisar `git diff --stat` e `git status --short` para confirmar ausência de alterações em deploy/infra e ausência de commits.

## Ordem de execução das funcionalidades

1. **FEAT-001 — Backend modular, validado e testável:** itens 1–4. Deve terminar com `npm test --prefix server` e build funcionando antes de iniciar o frontend.
2. **FEAT-002 — Camada de API e hook frontend + documentação:** itens 5–8. Depende das rotas/serviços backend estabilizados e termina com teste e build completos.
