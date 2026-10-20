-- Numeração por tenant: NULL em branch_id não pode gerar linhas duplicadas.
DROP INDEX IF EXISTS uq_sequences;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_sequences ON core_sequences (tenant_id, branch_id, kind) NULLS NOT DISTINCT;
