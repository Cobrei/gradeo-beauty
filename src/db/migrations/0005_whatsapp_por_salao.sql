-- Cada salão envia pelo próprio número (WhatsApp Business Platform, coexistência). Sem número global da gradeo.
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_phone_number_id varchar(40);
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_business_account_id varchar(40);
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_access_token text;
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_display_phone varchar(20);
--> statement-breakpoint
ALTER TABLE sal_settings ADD COLUMN IF NOT EXISTS wa_connected_at timestamptz;
