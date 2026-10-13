# Plano de Implementação — Status de Lançamentos

## Decisões registradas

- O campo persistido será `status`, com valores de API `paid`, `pending` e `next_month`; a UI exibirá exatamente `Pago`, `Pendente` e `Proximo Mes` (sem acento, preservando o texto solicitado). Valores estáveis de API evitam acoplar persistência a rótulos localizados.
- O status existe somente para despesas (`type: 'expense'`). Entradas não terão controle nem status funcional na UI. O padrão será `pending` para despesas novas e para despesas legadas sem campo; o fallback explícito evita `undefined`.
- `next_month` é apenas um status informativo: não move `date`, não cria transação e não altera totais, filtros ou parcelamento.
- O controle ficará na linha de cada item do extrato, entre o valor e remover, como `<select>` nativo acessível. A mutação atualizará o estado local sem recarregar a página; falha deve restaurar o valor anterior e mostrar erro.
- Não alterar Render, Docker/Compose, deploy, configurações operacionais, segredos, autenticação ou infraestrutura.

## Contrato HTTP decidido

`PATCH /api/transactions/:id/status`, protegido pelo Bearer já aplicado à rota. Body obrigatório: `{ "status": "paid" | "pending" | "next_month" }`. O servidor valida allowlist, filtra por `_id` e `userId`, rejeita entrada ou lançamento inexistente com erro controlado e retorna DTO com `id`, `userId`, `groupId`, `description`, `amount`, `type`, `category`, `date` e `status`. Status/body inválidos retornam `400`; lançamento inexistente ou de outro usuário retorna `404`.

## Implementação ordenada

- [ ] 1. Adicionar o campo condicional `status` ao `TransactionSchema`, com enum `paid`, `pending`, `next_month` e default `pending` somente para despesas; preservar os demais campos e contratos.
      Arquivo: `server/src/db.js`.
      Verificar: `npm test --prefix server` continua passando sem erro de schema.

- [ ] 2. Criar a allowlist `TRANSACTION_STATUSES` e o middleware de validação do body de atualização, exigindo objeto e valor permitido; manter o validator de criação compatível e impedir status funcional em entradas.
      Arquivo: `server/src/validators/transactionValidator.js`.
      Verificar: testes de validação retornam `400` para status desconhecido, body ausente e payload inválido, e aceitam os três valores.

- [ ] 3. Implementar no serviço o DTO com fallback `pending` para despesas legadas, o default das despesas criadas e `updateTransactionStatus(userId, transactionId, status)` usando `findOneAndUpdate` filtrado por `_id` e `userId`; lançar `AppError` 404 quando não encontrar o lançamento.
      Arquivo: `server/src/services/transactionService.js`.
      Verificar: `npm test --prefix server` cobre fallback, persistência simulada, isolamento e rejeição de entrada.

- [ ] 4. Expor o serviço como controller e rota autenticada `PATCH /:id/status`, usando `validateTransactionStatus` e `asyncHandler` no padrão das rotas existentes.
      Arquivos: `server/src/controllers/transactionController.js`, `server/src/routes/transactionRoutes.js`.
      Verificar: `npm test --prefix server` confirma contrato HTTP autenticado, resposta DTO, erros `400/404` e ausência de acesso entre usuários.

- [ ] 5. Adicionar testes backend para allowlist, default/fallback, PATCH persistido, autenticação, isolamento por `userId`, 404 e rejeição de entrada, preservando os testes atuais de listagem/criação/autenticação.
      Arquivos: `server/test/transactionService.test.js`, `server/test/app.integration.test.js`.
      Verificar: `npm test --prefix server` — todos os testes Node passam.

- [ ] 6. Adicionar `transactionApi.updateStatus` com PATCH, Bearer e body `status`; expor `updateTransactionStatus` no hook para atualizar somente a transação correspondente no estado, sem `refresh` ou recarga.
      Arquivos: `client/src/services/api.js`, `client/src/hooks/useDashboardData.js`.
      Verificar: `npm test --prefix client` cobre método, path, token, body e atualização local do fluxo.

- [ ] 7. Renderizar somente para despesas um `<select>` nativo com as três opções visíveis, fallback `pending`, label/`aria-label` do status atual e tratamento que restaura o valor anterior em erro; manter entradas, filtros, totais, parcelamento e remoção inalterados.
      Arquivo: `client/src/pages/DashboardPage.jsx`.
      Verificar: `npm test --prefix client` e `npm run build --prefix client` passam; o teste confirma as opções e a ausência do controle para entradas.

- [ ] 8. Atualizar/criar testes nativos do frontend para o contrato da API e o fluxo/renderização textual acessível, sem adicionar dependências ou alterar build/configuração operacional.
      Arquivo: `client/test/frontendMigration.test.js` (ou novo teste em `client/test/` se necessário).
      Verificar: `npm test --prefix client` — todos os testes passam.

## Verificação final

Executar, nesta ordem: `npm test --prefix server`, `npm test --prefix client`, `npm run build --prefix client` e `npm run build`. O último comando é o script existente e pode reinstalar dependências; nenhum arquivo de infraestrutura deve ser alterado.
