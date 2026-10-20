-- Limite de tentativas (login, cadastro, agendamento público). Tabela de sistema, sem salão.
CREATE TABLE IF NOT EXISTS core_rate_limits (
  key text NOT NULL,
  bucket bigint NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, bucket)
);
--> statement-breakpoint
REVOKE ALL ON core_rate_limits FROM app_rls;
