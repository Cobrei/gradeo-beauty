# ADR-002: Multi-tenant por coluna + RLS
Data: 2026-10-18 | Status: aceito

## Contexto
SaaS para várias escolas; cada escola pode ter várias unidades. Dados de criança são sensíveis (LGPD art. 14): vazamento entre escolas é inaceitável.

## Decisão
- Banco compartilhado; toda tabela de negócio carrega `tenant_id` (escola/rede) e, quando faz sentido, `branch_id` (unidade).
- Row-Level Security do PostgreSQL ativada em todas as tabelas de negócio; a aplicação abre cada transação com `SET LOCAL app.tenant_id`.
- O usuário pertence a um tenant; o papel pode ser restrito a unidades.

## Consequências
+ Barato, simples de operar, isolamento garantido pelo banco mesmo se a aplicação esquecer um filtro.
− Toda query roda dentro de transação com o contexto setado — o repositório base faz isso, ninguém chama o banco direto.
