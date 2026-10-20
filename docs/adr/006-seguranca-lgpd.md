# ADR-006: Segurança e LGPD
Data: 2026-10-18 | Status: aceito

- **Autorização por ação**: `modulo.recurso.acao` (ex.: `children.health.read_full`, `enrollment.enrollment.activate`), avaliada em `application/`, com escopo por unidade. A UI apenas esconde.
- **Dados sensíveis** (saúde, laudos, autorizados a buscar): ação própria para leitura completa; leitura resumida (selo "alergia a ovo") é ação separada. Toda leitura completa gera linha em `core_sensitive_access_log`.
- **Consentimentos** por finalidade (`core_consents`): foto pedagógica, divulgação, saúde, comunicação. Revogação tem efeito imediato na consulta.
- **Auditoria**: `core_audit_log(entity, entity_id, action, before, after, user_id, at, correlation_id)` escrita pelo repositório base.
- **Nada apagado**: `deleted_at`. Diário, rotina, lançamentos e parcelas pagas são imutáveis — correção vira novo registro.
- Senhas Argon2id; cookies httpOnly/SameSite=Lax; segredos em variáveis de ambiente; logs sem CPF/senha/token.
