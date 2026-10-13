---
inclusion: always
---

# Infraestrutura e serviços externos

- O aplicativo é hospedado no Render.
- A base de dados utilizada pelo aplicativo é MongoDB.
- O cadastro e a autenticação relacionados aos usuários utilizam o Brevo.
- Ao implementar ou alterar funcionalidades que dependam desses serviços, preservar a compatibilidade com o ambiente do Render, a persistência no MongoDB e o fluxo de autenticação/cadastro integrado ao Brevo.
- Não inserir credenciais, chaves de API ou segredos diretamente no código ou neste steering. Utilizar variáveis de ambiente configuradas no ambiente de execução.
- Ao propor mudanças de infraestrutura, considerar separadamente as configurações locais/de desenvolvimento e as configurações de produção no Render.
