-- Pacote de retenção (tudo opcional, desligado por padrão): pesquisa de satisfação, fidelidade e salão-parceiro.
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS partner_mode boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE sal_professionals ADD COLUMN IF NOT EXISTS cnpj varchar(18);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS agd_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  appointment_id uuid NOT NULL,
  client_id uuid,
  professional_id uuid,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment text,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_appt ON agd_feedback (tenant_id, appointment_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ix_feedback_tenant ON agd_feedback (tenant_id, created_at);
--> statement-breakpoint
ALTER TABLE agd_feedback ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE agd_feedback FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agd_feedback' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON agd_feedback USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON agd_feedback TO app_rls;
--> statement-breakpoint
INSERT INTO mkt_automations (tenant_id, kind, enabled, template, settings)
SELECT t.id, 'SURVEY', false, 'Oi {nome}! Obrigada pela visita no {salao} 💕 Como foi o seu {servico}? Dá uma nota de 1 a 5 aqui (leva 5 segundos): {avaliar}', '{"hoursAfter": 2}'::jsonb
FROM core_tenants t WHERE NOT EXISTS (SELECT 1 FROM mkt_automations a WHERE a.tenant_id = t.id AND a.kind = 'SURVEY');
--> statement-breakpoint
INSERT INTO mkt_automations (tenant_id, kind, enabled, template, settings)
SELECT t.id, 'LOYALTY', false, '{nome}, você completou {visitas} visitas no {salao}! 🎁 Seu presente de fidelidade: {voucher}, válido até {validade}. Obrigada por estar sempre com a gente!', '{"everyVisits": 10, "voucherKind": "PERCENT", "voucherValue": 20, "voucherDays": 60}'::jsonb
FROM core_tenants t WHERE NOT EXISTS (SELECT 1 FROM mkt_automations a WHERE a.tenant_id = t.id AND a.kind = 'LOYALTY');
