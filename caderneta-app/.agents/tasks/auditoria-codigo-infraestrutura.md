# Auditoria de qualidade de código e infraestrutura

**Projeto:** `c:\caderneta-off\financas\caderneta-app`  
**Data da análise:** 2026-10-13  
**Modo:** somente leitura; nenhuma correção foi aplicada.  
**Escopo:** código presente no repositório, configurações locais e documentação. Não houve acesso ao painel do Render, MongoDB Atlas, Brevo, logs de produção ou tráfego real.

## Resumo executivo

O projeto tem uma base pequena e relativamente simples, com separação clara entre cliente React/Vite e API Express/Mongoose, hash de senha com bcrypt, JWT com expiração e filtragem das transações por `userId`. Entretanto, a implementação atual **não deve ser considerada pronta para exposição pública sem endurecimento**.

Os riscos mais urgentes são:

1. **Crítico — segredo JWT previsível e hardcoded como fallback**, além de uma chave explícita no `docker-compose.yml`. Se `JWT_SECRET` não estiver configurado ou for conhecido, tokens podem ser forjados e qualquer conta/dado pode ser acessado.
2. **Alto — falta de rate limiting e controles contra abuso** em login, envio de códigos Brevo e cadastro. O endpoint de envio pode ser usado para spam e o login pode sofrer brute force; o cadastro também aceita entrada sem limites robustos.
3. **Alto — validação de entrada insuficiente no servidor**, incluindo `installments` sem teto server-side, campos financeiros/data/categoria sem validação completa e orçamento aceitando objeto arbitrário. Isso permite consumo excessivo de CPU/DB, dados inconsistentes e respostas 5xx.
4. **Alto — token JWT persistido em `localStorage` por sete dias.** Qualquer XSS futuro ou dependência/client-side comprometido pode exfiltrar o token; não há rotação, revogação ou mecanismo de sessão no servidor.
5. **Médio/Alto — ausência de headers de segurança, tratamento global de erros e política CORS explícita.** O app usa `cors()` aberto, não configura CSP/HSTS/anti-clickjacking/nosniff e possui várias rotas `async` sem tratamento consistente.
6. **Médio — configuração de build/deploy inconsistente:** `docker-compose.yml` referencia builds sem `Dockerfile` presente, o README descreve banco JSON local enquanto o código usa MongoDB, e o steering informa Render/MongoDB/Brevo sem configuração de produção verificável no repositório.

Não foi possível confirmar vulnerabilidades específicas das versões instaladas porque não há lockfile no repositório e a auditoria não instalou dependências nem executou comandos que pudessem criar/alterar artefatos. Também não foi possível validar configurações reais do Render, MongoDB ou Brevo.

## Evidências e achados

### SEC-001 — fallback de segredo JWT previsível e segredo exposto em Compose

- **Severidade:** Crítica
- **Confiança:** Alta; evidência direta no código/configuração.
- **Evidência:**
  - `server/src/index.js:11`: `process.env.JWT_SECRET || 'caderneta-chave-secreta-2026'`.
  - `server/src/middleware/auth.js:2`: repete o mesmo fallback.
  - `docker-compose.yml:10-12`: `JWT_SECRET=chave_producao_super_segura` em texto claro.
- **Impacto:** quando a variável não existe, qualquer pessoa que conheça o código pode assinar JWTs válidos. Em ambiente Compose, quem obtiver o arquivo pode forjar tokens; isso compromete a autorização de todos os dados financeiros. A duplicação da configuração também pode fazer assinatura e validação divergirem após uma alteração parcial.
- **Recomendação:** falhar no boot se `JWT_SECRET` estiver ausente, usar segredo aleatório forte exclusivamente no segredo do ambiente de produção, remover valores de produção do Compose versionado e centralizar a leitura/validação da configuração. Rotacionar qualquer segredo já usado fora do desenvolvimento. Não foi feita rotação nesta auditoria.

### SEC-002 — tokens de longa duração em `localStorage`

- **Severidade:** Alta
- **Confiança:** Alta.
- **Evidência:**
  - `server/src/index.js:95,108`: JWT com `expiresIn: '7d'`.
  - `client/src/context/AuthContext.jsx:39-40,55-56`: token salvo em `localStorage`.
  - `client/src/pages/AuthPage.jsx:49-50`: cadastro também grava diretamente o token.
- **Impacto:** uma injeção XSS, dependência comprometida ou script de terceiro executado na origem pode ler o token e reutilizá-lo por até sete dias. Não existe logout/revogação server-side nem rotação de refresh token.
- **Recomendação:** preferir cookie de sessão `HttpOnly`, `Secure`, `SameSite` adequado e proteção CSRF correspondente; reduzir duração, implementar rotação/revogação e invalidar sessões quando necessário. Se o armazenamento no browser for mantido temporariamente, documentar o risco e reduzir o TTL.

### SEC-003 — falta de rate limiting e proteção contra abuso nos fluxos de autenticação

- **Severidade:** Alta
- **Confiança:** Alta.
- **Evidência:**
  - `server/src/index.js:21-70`: `/api/auth/send-code` não tem limite por IP/e-mail, cooldown, limite diário ou bloqueio de tentativas.
  - `server/src/index.js:100-111`: `/api/auth/login` não tem limitação de tentativas.
  - Não há dependência ou middleware de rate limiting no `server/package.json` nem uso encontrado no código.
- **Impacto:** spam por Brevo, custos/limites do provedor atingidos, enumeração de e-mails por respostas distintas e brute force de senhas. A operação de exclusão/criação de códigos também pode ser abusada para invalidar códigos legítimos.
- **Recomendação:** aplicar limites por IP, e-mail e conta; cooldown e limite de códigos; backoff/bloqueio no login; respostas uniformes onde a enumeração for indesejada; monitorar eventos e limites do Brevo.

### SEC-004 — código de verificação gerado com `Math.random()`

- **Severidade:** Alta
- **Confiança:** Alta.
- **Evidência:** `server/src/index.js:29`: `Math.floor(100000 + Math.random() * 900000)`.
- **Impacto:** `Math.random()` não é um gerador criptograficamente seguro. Em conjunto com ausência de rate limiting, pode reduzir a resistência do código de seis dígitos e facilitar abuso do fluxo.
- **Recomendação:** gerar o código com `crypto.randomInt`, armazenar somente hash do código quando possível, limitar tentativas por emissão/endereço e manter TTL/uso único. O TTL de dez minutos está modelado em `server/src/db.js:23`, mas não substitui esses controles.

### SEC-005 — validação server-side incompleta e possibilidade de negação de serviço por parcelamento

- **Severidade:** Alta
- **Confiança:** Alta.
- **Evidência:**
  - `server/src/index.js:136-139`: apenas verifica presença; `installments` vira `parseInt(...)` e é limitado inferiormente, sem máximo server-side.
  - `server/src/index.js:147-179`: cria uma transação no banco em cada iteração.
  - `client/src/pages/DashboardPage.jsx:256-267`: o limite 48 existe apenas na UI e é bypassável por requisição manual.
  - `server/src/db.js:11-17`: há tipos/enums Mongoose, mas não limites de faixa, formato de data, categoria permitida ou tamanho de descrição.
- **Impacto:** uma requisição com muitas parcelas pode prender o event loop em trabalho sequencial e gerar grande volume de documentos; valores inválidos, datas impossíveis, números extremos/`NaN` e categorias inventadas podem provocar inconsistência ou erro 500. O valor parcelado também usa arredondamento por parcela sem ajuste explícito do centavo restante.
- **Recomendação:** usar schema de validação explícito antes do acesso ao banco, impor limites server-side (inclusive parcelas), validar e normalizar e-mail/nome/senha/data/valor/categoria, limitar body size e usar operação transacional/bulk quando apropriado. Definir política para arredondamento financeiro.

### SEC-006 — orçamento aceita objeto arbitrário do cliente

- **Severidade:** Média
- **Confiança:** Alta.
- **Evidência:** `server/src/index.js:198-205`: `findOneAndUpdate(..., { limits: req.body }, ...)`; `server/src/db.js:28`: `limits: { type: Object, default: {} }`.
- **Impacto:** qualquer chave e valor aceitos pelo cliente podem ser persistidos, inclusive tipos inesperados, estruturas excessivas ou campos que a UI não conhece. Isso degrada integridade dos dados e pode aumentar custo/uso de armazenamento; não há validação de limites monetários.
- **Recomendação:** aceitar apenas mapa de categorias allowlist, validar chaves e inteiros/faixas monetárias, impor tamanho máximo e rejeitar protótipos/estruturas anômalas. Usar schema explícito em vez de `Object` genérico.

### SEC-007 — CORS aberto e headers de segurança ausentes

- **Severidade:** Média
- **Confiança:** Alta.
- **Evidência:**
  - `server/src/index.js:18`: `app.use(cors())` sem allowlist de origem.
  - Não há uso de `helmet`, CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`/anti-clickjacking ou política explícita de referrer no código/configuração.
- **Impacto:** qualquer origem pode realizar requisições CORS permitidas pelo navegador para endpoints públicos; a política não documenta o domínio real do Render. Como o token é enviado em header Authorization e não há cookies, o CORS aberto não equivale sozinho a uma leitura autenticada por outro site, mas amplia superfície e pode causar problemas quando a autenticação mudar. Ausência de headers aumenta impacto de XSS, MIME sniffing e framing.
- **Recomendação:** configurar allowlist exata para os domínios do frontend/produção, restringir métodos e headers, não habilitar credenciais sem necessidade e adicionar headers de segurança via middleware/proxy do Render.

### SEC-008 — tratamento de erros inconsistente e possibilidade de respostas 5xx não controladas

- **Severidade:** Média
- **Confiança:** Alta.
- **Evidência:**
  - As rotas assíncronas em `server/src/index.js:21-218` não são envolvidas por middleware de erro global; somente a chamada inicial de `connectDB()` tem `.catch` (`linha 15`).
  - `server/src/index.js:104`: `bcrypt.compareSync(password, user.password)` pode receber entrada ausente/inválida sem validação prévia.
  - `server/src/index.js:188`: ID Mongo inválido pode gerar CastError em `findOneAndDelete` sem resposta de domínio controlada.
  - `client/src/pages/DashboardPage.jsx:90-111,113-132`: operações de criação/remoção/atualização não tratam erros de rede/resposta para o usuário; a atualização otimista de orçamento não é revertida.
- **Impacto:** entradas malformadas podem produzir 500, logs ruidosos ou comportamento inconsistente; falhas de banco/Brevo ficam difíceis de observar e o cliente pode mostrar estado divergente.
- **Recomendação:** adicionar wrapper de async e error handler final com respostas JSON uniformes, tratar erros de validação/duplicidade/CastError sem stack para o cliente, registrar contexto sem segredos e tratar/reverter falhas no cliente.

### SEC-009 — e-mail/HTML do Brevo usa valor de entrada sem validação formal

- **Severidade:** Média
- **Confiança:** Alta para ausência de validação; impacto de injeção de HTML no e-mail é dependente do valor aceito pelo provedor.
- **Evidência:** `server/src/index.js:22-26,42-55`: e-mail é apenas convertido para minúsculas e interpolado no destinatário; o código é interpolado no `htmlContent`. Não há schema de e-mail nem validação de nome/remetente configurado.
- **Impacto:** entradas fora do formato esperado podem causar rejeições, abuso do provedor ou problemas de renderização do e-mail. O código gerado pelo servidor é numérico, portanto não é controlado pelo usuário; não foi observada interpolação do nome no HTML.
- **Recomendação:** validar e-mail com biblioteca/schema, normalizar de forma consistente, configurar remetente permitido e manter o conteúdo do e-mail com escaping/templating seguro. Nunca aceitar remetente ou chave do cliente.

### SEC-010 — risco de condição de corrida no cadastro e ausência de transação/consumo atômico do código

- **Severidade:** Média
- **Confiança:** Média/Alta.
- **Evidência:** `server/src/index.js:80-94`: consulta o código, consulta usuário, cria usuário e somente depois remove códigos; não há operação atômica/consumo condicionado. `server/src/db.js:5` declara `unique: true`, mas a rota não trata explicitamente erro de índice único.
- **Impacto:** requisições concorrentes podem consumir o mesmo código em condições de corrida ou gerar erro de duplicidade; o código não é marcado como usado até depois da criação do usuário. A confiança é limitada porque o comportamento final depende de concorrência e índices existentes no MongoDB.
- **Recomendação:** consumir o código com `findOneAndDelete` condicionado antes/na mesma transação da criação, ou usar transação/estado de uso e tratar `E11000` com resposta controlada.

### SEC-011 — logs podem expor dados operacionais sensíveis e observabilidade é limitada

- **Severidade:** Baixa/Média
- **Confiança:** Média.
- **Evidência:** `server/src/index.js:60-67` registra resposta de erro do Brevo e erro capturado; `server/src/db.js:44` registra conexão; `server/src/index.js:217` registra inicialização. Não há política de redaction, logger estruturado, correlação ou auditoria de autenticação.
- **Impacto:** respostas do provedor podem conter identificadores ou detalhes operacionais; sem logs estruturados não há boa detecção de brute force, spam, falhas de MongoDB ou alterações de orçamento.
- **Recomendação:** usar logger estruturado com redaction, não registrar tokens/senhas/códigos/corpos completos, definir retenção e métricas/alertas para auth, Brevo, MongoDB e erros 5xx.

### QUA-001 — documentação e implementação estão desalinhadas

- **Severidade:** Média
- **Confiança:** Alta.
- **Evidência:**
  - `README.md:14-19` descreve backend com banco JSON local `server/data.json`, mas esse arquivo não existe na listagem e `server/src/db.js:41-44` usa `MONGODB_URI`.
  - `README.md:22-26` apresenta hospedagem como opções genéricas, enquanto `.kiro/steering/project-infrastructure.md:7-9` declara Render, MongoDB e Brevo como contexto obrigatório.
  - O README não documenta as variáveis `MONGODB_URI`, `JWT_SECRET`, `SENDER_EMAIL` e `BREVO_API_KEY`, nem comandos de teste/lint.
- **Impacto:** risco operacional de deploy incorreto, configuração ausente e manutenção baseada em comportamento que não existe.
- **Recomendação:** atualizar documentação para a arquitetura real e separar claramente desenvolvimento local, Render, MongoDB e Brevo; documentar secrets por nome, sem valores, health checks, migrações/índices e comandos de validação.

### INFRA-001 — Compose não é reproduzível conforme versionado

- **Severidade:** Média
- **Confiança:** Alta.
- **Evidência:** `docker-compose.yml:4-7` e `docker-compose.yml:15-17` referenciam `./server` e `./client` como contextos de build, mas não há `Dockerfile` na árvore auditada. O volume `server_data:/app` também não corresponde ao MongoDB usado em `server/src/db.js`.
- **Impacto:** `docker compose build` provavelmente falha por ausência de Dockerfiles; mesmo que imagens externas sejam adicionadas fora do repositório, a configuração não representa a persistência real do MongoDB. A chave no Compose também é inadequada para produção.
- **Recomendação:** decidir se Compose é apenas desenvolvimento ou artefato de deploy, adicionar artefatos necessários somente em mudança aprovada, remover segredo estático e documentar conexão com MongoDB. Nenhuma alteração foi feita.

### DEP-001 — dependências não podem ser auditadas com precisão a partir do estado versionado

- **Severidade:** Média (risco de processo)
- **Confiança:** Alta.
- **Evidência:** `client/package.json` e `server/package.json` usam intervalos `^`; não há `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock` ou `pnpm-lock.yaml` na árvore auditada. O servidor inclui `mongoose`, embora a documentação antiga mencione outro armazenamento.
- **Impacto:** instalações em momentos distintos podem resolver versões diferentes, dificultando reprodução e identificação de vulnerabilidades. Sem lockfile não é possível atribuir CVEs às versões realmente instaladas.
- **Recomendação:** gerar e versionar lockfiles em procedimento controlado, fixar/atualizar dependências com revisão e executar auditoria de dependências no CI. Não foi instalado nada nem criado lockfile nesta auditoria.

## Diagnóstico de qualidade de código

**Pontos positivos observados:**

- A divisão `client/src`, `server/src`, `pages`, `context` e `middleware` é simples e compreensível.
- Rotas autenticadas filtram transações por `userId` (`server/src/index.js:121-133,188`) e o middleware usa `jwt.verify` (`server/src/middleware/auth.js:9-12`).
- Senhas são armazenadas com bcrypt (`server/src/index.js:86`) e a resposta de login/registro não devolve o hash.
- O schema de transação restringe `type` a `income`/`expense` (`server/src/db.js:15`) e há índice no `userId` (`linha 11`); códigos possuem TTL de 600 segundos (`server/src/db.js:23`).
- O React escapa texto interpolado por padrão; não foi encontrado `dangerouslySetInnerHTML` nem `innerHTML` no código auditado. Os campos de descrição/nome exibidos na UI são renderizados como texto.
- O código de verificação é removido após cadastro bem-sucedido (`server/src/index.js:94`), embora o consumo não seja atômico.

**Problemas estruturais:**

- `server/src/index.js` concentra inicialização, autenticação, integração Brevo, regras financeiras, persistência e serving do frontend; isso dificulta testes isolados e tratamento uniforme de erros.
- Não há testes, lint, TypeScript, schemas de request ou camada de serviço/repositório visíveis no repositório.
- O backend inicia `app.listen` mesmo quando `connectDB()` falha (`server/src/index.js:15,217`), permitindo que a aplicação pareça disponível enquanto chamadas ao banco falham.
- A aplicação não expõe health/readiness endpoints nem há evidência de graceful shutdown do Express/Mongoose.
- No cliente, várias operações dependem de `fetch` direto e não há camada de API central para tratamento uniforme de 401, timeout, erros ou retry controlado.

## Diagnóstico de infraestrutura e serviços

- **Render:** o steering declara Render, mas não há `render.yaml`, Dockerfile ou configuração de serviço no repositório auditado. Não é possível confirmar TLS, domínio, variáveis secretas, health check, autoscaling, política de logs, rede ou configuração de build do ambiente real.
- **MongoDB:** a conexão usa `process.env.MONGODB_URI` (`server/src/db.js:38-44`), sem opções explícitas de timeout, pool, TLS ou tratamento de indisponibilidade; a segurança de rede, usuário, IP allowlist, backups e índices de produção não pode ser verificada. O índice TTL depende da criação efetiva de índices no ambiente MongoDB.
- **Brevo:** a chave é lida de `BREVO_API_KEY` e enviada server-side (`server/src/index.js:12,35-40`), o que é positivo; porém não há timeout explícito no `fetch`, rate limiting, retries com backoff ou circuit breaker. A validade do remetente, limites de conta e logs no Brevo não podem ser confirmados.
- **Docker/Compose:** não há Dockerfiles versionados e o Compose expõe a porta 4000 diretamente, usa segredo em claro e declara volume que não corresponde ao banco real.
- **Headers/TLS:** não há configuração local de headers de segurança. HTTPS e terminação TLS do Render não foram verificáveis por leitura do repositório.

## Injeções, XSS, CSRF e SSRF — avaliação específica

- **MongoDB injection:** não foi observada interpolação de query Mongo a partir de strings em endpoints de consulta; os filtros usam campos fixos. Ainda assim, `req.body` inteiro é salvo em `Budget.limits`, e o restante da validação é insuficiente, portanto a integridade e o tamanho do documento precisam ser restringidos.
- **XSS:** não foi encontrado sink explícito de HTML inseguro; React normalmente escapa os campos exibidos. O armazenamento em `localStorage` mantém impacto alto caso um XSS seja introduzido no futuro. Dependências e CSP não foram validadas em execução.
- **CSRF:** o modelo atual usa token em header `Authorization`, não cookie, então o risco clássico de envio automático de cookie é reduzido. Não é uma confirmação de segurança geral: CORS está aberto e uma futura migração para cookies exigirá SameSite/CSRF token.
- **SSRF:** não há URL controlada pelo usuário; o único destino externo observado é a URL fixa da API Brevo (`server/src/index.js:34`). Não foi identificado SSRF no código auditado.
- **Header injection/e-mail:** não há entrada de usuário no remetente e o código interpolado é gerado localmente, mas falta validação de e-mail e timeout da chamada externa.

## Prioridades imediatas recomendadas

1. Remover os fallbacks JWT e o segredo do Compose; exigir segredo forte de ambiente e rotacionar segredos potencialmente expostos.
2. Colocar rate limiting/cooldown em login, envio de código e registro; usar `crypto.randomInt`, limitar tentativas e consumir códigos atomicamente.
3. Introduzir validação server-side centralizada para todos os requests, com limites de tamanho, parcelas, valores, datas, categorias, nome, senha e orçamento.
4. Definir uma estratégia de sessão: preferencialmente cookies HttpOnly/Secure/SameSite com CSRF adequado, TTL menor, rotação e revogação.
5. Configurar CORS por allowlist e headers de segurança, além de middleware global de erro, timeouts e respostas JSON uniformes.
6. Corrigir documentação/Compose/artefatos de deploy para refletir Render + MongoDB + Brevo; adicionar health/readiness e observabilidade sem registrar segredos.
7. Versionar lockfiles e estabelecer CI com build, testes, lint e auditoria de dependências.

## Verificações executadas e limitações

Comandos de inspeção executados sem alteração do projeto:

- Listagem recursiva de arquivos excluindo `node_modules` e `.git`.
- Leitura de `README.md`, manifests `package.json`, `docker-compose.yml`, steering, configurações Vite/Tailwind/PostCSS e todos os arquivos em `client/src` e `server/src`.
- `git -C "C:\caderneta-off\financas\caderneta-app" status --short --untracked-files=all` para verificar o estado inicial.
- Busca de arquivos `.env*`, Dockerfiles, configurações Render, lockfiles e artefatos de deploy.
- Busca textual por segredos/configuração, autenticação, `localStorage`, `cors`, `Math.random`, sinks HTML e tratamento de erros.
- Extração de ocorrências com caminho e número de linha para controles de autenticação, validação e persistência.

Não foram executados `npm install`, `npm audit`, `npm run build`, testes, servidores, Compose ou chamadas a Render/MongoDB/Brevo. A razão é preservar o modo somente leitura e evitar criação/alteração de lockfiles, `node_modules`, `client/dist`, containers, conexões externas ou dados. Como não há lockfile nem scripts de teste/lint no estado auditado, a versão efetivamente resolvida das dependências e os resultados dinâmicos de build/teste permanecem **não verificáveis**. A auditoria também não pode confirmar configurações secretas, ACLs, TLS, backups, logs ou comportamento da infraestrutura hospedada.

## Conclusão

A aplicação demonstra controles básicos corretos, especialmente isolamento de consultas por usuário, hash de senha, verificação JWT, TTL dos códigos e ausência de sinks HTML explícitos. Porém, os achados SEC-001 a SEC-005 são suficientes para classificar o risco de produção como alto, com SEC-001 em nível crítico. As recomendações acima devem ser tratadas como plano de correção; nenhuma foi implementada nesta investigação.
