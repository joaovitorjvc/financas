# Relatório — Status de lançamentos de saída

**Data:** 2026-10-13  
**Status:** Implementado e aprovado na revisão final

## Funcionalidade

Lançamentos do tipo saída/despesa agora possuem um status persistido com três opções:

- `Pago` — valor interno `paid`
- `Pendente` — valor interno `pending`
- `Proximo Mes` — valor interno `next_month`

A interface exibe um controle `<select>` nativo ao lado de cada saída. Entradas/receitas não exibem esse controle. O valor `pending` é usado como fallback para despesas antigas que ainda não possuíam status.

`Proximo Mes` é apenas um status informativo: não altera a data, não cria outro lançamento e não modifica os cálculos mensais.

## Alterações realizadas

### Backend

- Adicionado campo condicional `status` ao modelo de transação.
- Criada allowlist de status válidos no validador.
- Criado endpoint autenticado `PATCH` para atualização do status.
- A atualização exige autenticação Bearer e filtra simultaneamente por `_id`, `userId` e `type: expense`.
- Despesas legadas recebem `pending` na resposta quando não possuem status.
- Entradas continuam sem status funcional.
- Adicionados testes para allowlist, fallback, isolamento por usuário, respostas HTTP e validação.

### Frontend

- Adicionada chamada PATCH na camada central de API.
- O hook do dashboard atualiza somente a transação alterada, sem recarregar a página.
- O controle é acessível por teclado e possui identificação adequada para leitores de tela.
- Falhas na atualização exibem mensagem de erro e não alteram o estado local de forma otimista.
- Filtros, totais, datas e parcelamento existentes foram preservados.

## Arquivos principais envolvidos

- `server/src/db.js`
- `server/src/validators/transactionValidator.js`
- `server/src/services/transactionService.js`
- `server/src/controllers/transactionController.js`
- `server/src/routes/transactionRoutes.js`
- `client/src/services/api.js`
- `client/src/hooks/useDashboardData.js`
- `client/src/pages/DashboardPage.jsx`
- `server/test/transactionService.test.js`
- `server/test/app.integration.test.js`
- `client/test/frontendMigration.test.js`

## Validações executadas

- `npm test --prefix server` — **12/12 aprovados**
- `npm test --prefix client` — **5/5 aprovados**
- `npm run build --prefix client` — **aprovado**
- `git diff --check` — **aprovado**
- Revisão semântica do diff — **APPROVED**

## Infraestrutura

Nenhum arquivo de Render, MongoDB/Brevo operacional, Docker, Docker Compose, Dockerfile, CI, deploy, segredo ou steering foi alterado.

A funcionalidade usa o MongoDB já existente por meio do modelo e dos serviços atuais; não requer migração manual porque despesas antigas recebem fallback para `pending`.

## Observações

- Os valores internos da API permanecem em inglês (`paid`, `pending`, `next_month`) para manter consistência técnica.
- Os textos apresentados ao usuário permanecem em português.
- O workflow registrou commits locais durante a implementação, sem push para o repositório remoto.
- Os riscos de segurança já conhecidos — fallback JWT, token em `localStorage` e CORS aberto — não foram alterados, pois pertencem a uma mudança de segurança separada.
