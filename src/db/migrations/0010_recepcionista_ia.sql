-- Recepcionista com IA (opcional, desligada por padrão).
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS ai_receptionist boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS ai_name varchar(40);
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS ai_instructions text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS mkt_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  channel varchar(12) NOT NULL,
  external_id varchar(80) NOT NULL,
  client_name varchar(120),
  client_phone varchar(20),
  status varchar(12) NOT NULL DEFAULT 'OPEN',
  needs_human boolean NOT NULL DEFAULT false,
  human_reason text,
  appointment_id uuid,
  message_count integer NOT NULL DEFAULT 0,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_conv_ext ON mkt_ai_conversations (tenant_id, channel, external_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ix_ai_conv_last ON mkt_ai_conversations (tenant_id, last_message_at);
--> statement-breakpoint
ALTER TABLE mkt_ai_conversations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE mkt_ai_conversations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mkt_ai_conversations' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON mkt_ai_conversations USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON mkt_ai_conversations TO app_rls;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS mkt_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  role varchar(12) NOT NULL,
  text text NOT NULL DEFAULT '',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ix_ai_msg_conv ON mkt_ai_messages (tenant_id, conversation_id, created_at);
--> statement-breakpoint
ALTER TABLE mkt_ai_messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE mkt_ai_messages FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mkt_ai_messages' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON mkt_ai_messages USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
  END IF;
END $$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON mkt_ai_messages TO app_rls;
