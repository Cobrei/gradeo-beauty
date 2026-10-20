# ADR-005: Eventos de domínio com outbox
Data: 2026-10-18 | Status: aceito

Mudança de estado relevante (matrícula ativada, parcela paga, medicação dada, ocorrência registrada) grava um evento na tabela `core_outbox` **na mesma transação** do agregado. Um worker (cron da Vercel ou processo) publica e consumidores idempotentes (`core_processed_events`) reagem: gerar lançamento contábil, notificar família, atualizar painel.
Síncrono entre módulos só pela interface pública (`enrollment.getActiveEnrollment(childId)`), nunca pela tabela alheia.
