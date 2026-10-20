-- Marca do salão (logo e cor) e links públicos com token (recibo e confirmação de horário).
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS logo_data text;
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS brand_color varchar(7);
--> statement-breakpoint
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_public_token ON pos_orders (public_token);
--> statement-breakpoint
ALTER TABLE agd_appointments ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_public_token ON agd_appointments (public_token);
--> statement-breakpoint
-- WhatsApp por QR code (servidor próprio da gradeo, uma instância por salão)
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_qr_instance varchar(80);
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_qr_connected_at timestamptz;
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_qr_phone varchar(20);
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_qr_terms_accepted_at timestamptz;
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_qr_terms_accepted_by uuid;
--> statement-breakpoint
-- Lembrete padrão passa a levar o link de confirmação (só onde o texto ainda é o original)
UPDATE mkt_automations SET template = 'Oi {nome}! Passando para lembrar do seu horário {data} às {hora} ({servico}) com {profissional}, no {salao}. Confirme por aqui: {confirmar} 💕'
WHERE kind = 'REMINDER_24H' AND template = 'Oi {nome}! Passando para lembrar do seu horário amanhã às {hora} ({servico}) com {profissional}, no {salao}. Se precisar remarcar, é só responder aqui 💕';
