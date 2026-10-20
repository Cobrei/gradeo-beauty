-- Row-Level Security em toda tabela com tenant_id.
-- A aplicação executa `set_config('app.tenant_id', ..., true)` no início de cada transação.
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'tenant_id'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE agd_appointments ADD CONSTRAINT ck_appt_status CHECK (status IN ('REQUESTED','SCHEDULED','CONFIRMED','IN_SERVICE','DONE','NO_SHOW','CANCELLED'));
--> statement-breakpoint
ALTER TABLE agd_appointments ADD CONSTRAINT ck_appt_time CHECK (ends_at > starts_at);
--> statement-breakpoint
ALTER TABLE agd_appointments ADD CONSTRAINT ck_appt_who CHECK (client_id IS NOT NULL OR walk_in_name IS NOT NULL);
--> statement-breakpoint
ALTER TABLE agd_blocks ADD CONSTRAINT ck_block_time CHECK (ends_at > starts_at);
--> statement-breakpoint
ALTER TABLE pos_orders ADD CONSTRAINT ck_order_status CHECK (status IN ('OPEN','PAID','CANCELLED'));
--> statement-breakpoint
ALTER TABLE pos_orders ADD CONSTRAINT ck_order_amounts CHECK (subtotal >= 0 AND discount >= 0 AND voucher_discount >= 0 AND total >= 0);
--> statement-breakpoint
ALTER TABLE pos_order_items ADD CONSTRAINT ck_item_kind CHECK (kind IN ('SERVICE','PRODUCT','PACKAGE'));
--> statement-breakpoint
ALTER TABLE pos_order_items ADD CONSTRAINT ck_item_qty CHECK (qty > 0);
--> statement-breakpoint
ALTER TABLE pos_payments ADD CONSTRAINT ck_pay_method CHECK (method IN ('PIX','CASH','CREDIT','DEBIT','TRANSFER','OTHER'));
--> statement-breakpoint
ALTER TABLE pos_payments ADD CONSTRAINT ck_pay_amount CHECK (amount > 0 AND installments BETWEEN 1 AND 24);
--> statement-breakpoint
ALTER TABLE pos_cash_moves ADD CONSTRAINT ck_cash_move CHECK (kind IN ('IN','OUT') AND amount > 0);
--> statement-breakpoint
ALTER TABLE sal_stock_moves ADD CONSTRAINT ck_stock_kind CHECK (kind IN ('IN','OUT','SALE','USE','ADJUST'));
--> statement-breakpoint
ALTER TABLE sal_professionals ADD CONSTRAINT ck_prof_comm CHECK (commission_pct BETWEEN 0 AND 100 AND product_commission_pct BETWEEN 0 AND 100);
--> statement-breakpoint
ALTER TABLE sal_services ADD CONSTRAINT ck_service_dur CHECK (duration_min BETWEEN 5 AND 600 AND price >= 0);
--> statement-breakpoint
ALTER TABLE mkt_vouchers ADD CONSTRAINT ck_voucher_kind CHECK (kind IN ('PERCENT','AMOUNT') AND value > 0 AND max_uses >= 1 AND valid_until >= valid_from);
--> statement-breakpoint
ALTER TABLE mkt_vouchers ADD CONSTRAINT ck_voucher_status CHECK (status IN ('ACTIVE','PAUSED','EXPIRED'));
--> statement-breakpoint
ALTER TABLE mkt_campaigns ADD CONSTRAINT ck_campaign_status CHECK (status IN ('DRAFT','READY','SENDING','SENT','PAUSED'));
--> statement-breakpoint
ALTER TABLE mkt_messages ADD CONSTRAINT ck_message_status CHECK (status IN ('QUEUED','SENT','FAILED','SKIPPED','OPTOUT'));
--> statement-breakpoint
ALTER TABLE crm_clients ADD CONSTRAINT ck_client_gender CHECK (gender IN ('F','M','N'));
--> statement-breakpoint
ALTER TABLE crm_client_notes ADD CONSTRAINT ck_note_kind CHECK (kind IN ('FORMULA','ALLERGY','PREFERENCE','NOTE'));
--> statement-breakpoint
-- Comanda paga é imutável: itens e totais não mudam depois do pagamento.
CREATE OR REPLACE FUNCTION pos_order_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'PAID' AND NEW.status = 'PAID' AND (NEW.total <> OLD.total OR NEW.subtotal <> OLD.subtotal OR NEW.discount <> OLD.discount) THEN
    RAISE EXCEPTION 'POS_ORDER_IMMUTABLE: comanda paga não pode ser alterada';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_order_immutable BEFORE UPDATE ON pos_orders FOR EACH ROW EXECUTE FUNCTION pos_order_immutable();
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX ix_clients_name_trgm ON crm_clients USING gin (full_name gin_trgm_ops);
--> statement-breakpoint
-- Número de comanda único por salão
CREATE UNIQUE INDEX uq_orders_number ON pos_orders (tenant_id, number);
