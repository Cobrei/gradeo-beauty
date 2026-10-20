-- Controle da nota fiscal (NF-e) de cada fechamento de comissão / repasse.
ALTER TABLE pos_commission_closings ADD COLUMN IF NOT EXISTS nf_number varchar(40);
--> statement-breakpoint
ALTER TABLE pos_commission_closings ADD COLUMN IF NOT EXISTS nf_at timestamptz;
