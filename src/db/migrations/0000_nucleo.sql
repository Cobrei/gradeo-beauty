CREATE TABLE "core_audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "core_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" uuid NOT NULL,
	"entity" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(32) NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"user_id" uuid,
	"correlation_id" varchar(64),
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(16) NOT NULL,
	"cnpj" varchar(14),
	"inep_code" varchar(12),
	"address_json" jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"subject_type" varchar(32) NOT NULL,
	"subject_id" uuid NOT NULL,
	"purpose" varchar(48) NOT NULL,
	"granted_by_person_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"evidence_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "core_outbox" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "core_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"aggregate_type" varchar(48) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_processed_events" (
	"event_id" bigint NOT NULL,
	"consumer" varchar(64) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(80) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_sensitive_access_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "core_sensitive_access_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_type" varchar(32) NOT NULL,
	"subject_id" uuid NOT NULL,
	"data_kind" varchar(32) NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_sequences" (
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"kind" varchar(32) NOT NULL,
	"last_number" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "core_tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"legal_name" varchar(160),
	"cnpj" varchar(14),
	"tax_regime" varchar(24) DEFAULT 'SIMPLES' NOT NULL,
	"timezone" varchar(48) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"branch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "core_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"person_id" uuid,
	"name" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sal_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(120) NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price" numeric(19, 4) DEFAULT '0' NOT NULL,
	"validity_days" integer DEFAULT 90 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sal_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(120) NOT NULL,
	"brand" varchar(60),
	"sku" varchar(40),
	"unit" varchar(8) DEFAULT 'un' NOT NULL,
	"sale_price" numeric(19, 4) DEFAULT '0' NOT NULL,
	"cost_price" numeric(19, 4) DEFAULT '0' NOT NULL,
	"stock_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"min_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"for_sale" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sal_professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid,
	"name" varchar(120) NOT NULL,
	"nickname" varchar(40),
	"phone" varchar(20),
	"color" varchar(7) DEFAULT '#b8475f' NOT NULL,
	"commission_pct" numeric(5, 2) DEFAULT '40.00' NOT NULL,
	"product_commission_pct" numeric(5, 2) DEFAULT '10.00' NOT NULL,
	"working_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"service_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accepts_online" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sal_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"slug" varchar(48) NOT NULL,
	"segment" varchar(24) DEFAULT 'SALAO' NOT NULL,
	"phone" varchar(20),
	"whatsapp" varchar(20),
	"instagram" varchar(60),
	"address_json" jsonb,
	"opening_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"slot_minutes" integer DEFAULT 15 NOT NULL,
	"online_booking" boolean DEFAULT true NOT NULL,
	"online_booking_lead_min" integer DEFAULT 60 NOT NULL,
	"review_url" text,
	"message_provider" varchar(16) DEFAULT 'MANUAL' NOT NULL,
	"message_sender_name" varchar(60),
	"onboarding_done" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sal_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(40) DEFAULT 'Geral' NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"price" numeric(19, 4) DEFAULT '0' NOT NULL,
	"cost" numeric(19, 4) DEFAULT '0' NOT NULL,
	"commission_pct" numeric(5, 2),
	"return_interval_days" integer,
	"online_booking" boolean DEFAULT true NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sal_stock_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"product_id" uuid NOT NULL,
	"kind" varchar(12) NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"unit_cost" numeric(19, 4),
	"reason" varchar(120),
	"order_id" uuid
);
--> statement-breakpoint
CREATE TABLE "crm_client_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"client_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"order_id" uuid,
	"total" integer NOT NULL,
	"remaining" integer NOT NULL,
	"expires_at" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_client_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"client_id" uuid NOT NULL,
	"kind" varchar(16) DEFAULT 'NOTE' NOT NULL,
	"service_id" uuid,
	"professional_id" uuid,
	"text" text NOT NULL,
	"photo_url" text,
	"note_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"phone" varchar(20),
	"email" varchar(160),
	"birth_date" date,
	"gender" varchar(1) DEFAULT 'N' NOT NULL,
	"cpf" varchar(11),
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" varchar(24) DEFAULT 'MANUAL' NOT NULL,
	"referred_by_client_id" uuid,
	"preferred_professional_id" uuid,
	"marketing_opt_in" timestamp with time zone,
	"marketing_opt_out" timestamp with time zone,
	"first_visit_at" date,
	"last_visit_at" date,
	"visits_count" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(19, 4) DEFAULT '0' NOT NULL,
	"avg_interval_days" integer
);
--> statement-breakpoint
CREATE TABLE "agd_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"professional_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" varchar(120)
);
--> statement-breakpoint
CREATE TABLE "agd_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"client_id" uuid,
	"walk_in_name" varchar(120),
	"professional_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" varchar(12) DEFAULT 'SCHEDULED' NOT NULL,
	"source" varchar(12) DEFAULT 'APP' NOT NULL,
	"price" numeric(19, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"voucher_code" varchar(24),
	"order_id" uuid,
	"confirmed_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"thanks_sent_at" timestamp with time zone,
	"cancel_reason" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "agd_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"client_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"professional_id" uuid,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"period_pref" varchar(8) DEFAULT 'ANY' NOT NULL,
	"note" varchar(160),
	"status" varchar(10) DEFAULT 'WAITING' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pos_cash_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"session_id" uuid NOT NULL,
	"kind" varchar(8) NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"description" varchar(160) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_by" uuid NOT NULL,
	"opening_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"closing_amount" numeric(19, 4),
	"expected_cash" numeric(19, 4),
	"summary_json" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "pos_commission_closings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"professional_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"services_total" numeric(19, 4) NOT NULL,
	"products_total" numeric(19, 4) NOT NULL,
	"commission_total" numeric(19, 4) NOT NULL,
	"adjustments" numeric(19, 4) DEFAULT '0' NOT NULL,
	"items_json" jsonb NOT NULL,
	"status" varchar(8) DEFAULT 'CLOSED' NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pos_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" varchar(8) NOT NULL,
	"ref_id" uuid NOT NULL,
	"description" varchar(160) NOT NULL,
	"professional_id" uuid,
	"appointment_id" uuid,
	"qty" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit_price" numeric(19, 4) NOT NULL,
	"discount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"total" numeric(19, 4) NOT NULL,
	"commission_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"commission_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"paid_with_credit_id" uuid
);
--> statement-breakpoint
CREATE TABLE "pos_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"number" integer NOT NULL,
	"client_id" uuid,
	"walk_in_name" varchar(120),
	"status" varchar(10) DEFAULT 'OPEN' NOT NULL,
	"subtotal" numeric(19, 4) DEFAULT '0' NOT NULL,
	"discount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"discount_reason" varchar(120),
	"voucher_id" uuid,
	"voucher_discount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"total" numeric(19, 4) DEFAULT '0' NOT NULL,
	"paid_at" timestamp with time zone,
	"service_date" date NOT NULL,
	"cash_session_id" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "pos_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"order_id" uuid NOT NULL,
	"method" varchar(10) NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"installments" integer DEFAULT 1 NOT NULL,
	"fee_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cash_session_id" uuid
);
--> statement-breakpoint
CREATE TABLE "mkt_automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"kind" varchar(24) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"template" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_run_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mkt_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(120) NOT NULL,
	"channel" varchar(10) DEFAULT 'WHATSAPP' NOT NULL,
	"segment" jsonb DEFAULT '{"preset":"ALL"}'::jsonb NOT NULL,
	"message" text NOT NULL,
	"voucher_kind" varchar(8),
	"voucher_value" numeric(19, 4),
	"voucher_days" integer,
	"voucher_service_id" uuid,
	"status" varchar(10) DEFAULT 'DRAFT' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"audience_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"campaign_id" uuid,
	"automation_kind" varchar(24),
	"client_id" uuid NOT NULL,
	"appointment_id" uuid,
	"channel" varchar(10) NOT NULL,
	"to" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"voucher_id" uuid,
	"status" varchar(10) DEFAULT 'QUEUED' NOT NULL,
	"provider_id" varchar(120),
	"error" varchar(255),
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mkt_voucher_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"voucher_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"client_id" uuid,
	"discount" numeric(19, 4) NOT NULL,
	"order_total" numeric(19, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mkt_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"code" varchar(24) NOT NULL,
	"name" varchar(120) NOT NULL,
	"campaign_id" uuid,
	"client_id" uuid,
	"kind" varchar(8) NOT NULL,
	"value" numeric(19, 4) NOT NULL,
	"min_order" numeric(19, 4) DEFAULT '0' NOT NULL,
	"service_id" uuid,
	"valid_from" date NOT NULL,
	"valid_until" date NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"status" varchar(8) DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core_sessions" ADD CONSTRAINT "core_sessions_user_id_core_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_roles" ADD CONSTRAINT "core_user_roles_user_id_core_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."core_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_roles" ADD CONSTRAINT "core_user_roles_role_id_core_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."core_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_user_roles" ADD CONSTRAINT "core_user_roles_branch_id_core_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."core_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sal_stock_moves" ADD CONSTRAINT "sal_stock_moves_product_id_sal_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."sal_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_client_credits" ADD CONSTRAINT "crm_client_credits_client_id_crm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."crm_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_client_notes" ADD CONSTRAINT "crm_client_notes_client_id_crm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."crm_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_cash_moves" ADD CONSTRAINT "pos_cash_moves_session_id_pos_cash_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pos_cash_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_order_items" ADD CONSTRAINT "pos_order_items_order_id_pos_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pos_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_order_id_pos_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pos_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mkt_voucher_redemptions" ADD CONSTRAINT "mkt_voucher_redemptions_voucher_id_mkt_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."mkt_vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_audit_entity" ON "core_audit_log" USING btree ("tenant_id","entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_branches_tenant_code" ON "core_branches" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "ix_consents_subject" ON "core_consents" USING btree ("tenant_id","subject_id","purpose");--> statement-breakpoint
CREATE INDEX "ix_outbox_unpublished" ON "core_outbox" USING btree ("published_at","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_processed" ON "core_processed_events" USING btree ("event_id","consumer");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_tenant_code" ON "core_roles" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "ix_sensitive_subject" ON "core_sensitive_access_log" USING btree ("tenant_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sequences" ON "core_sequences" USING btree ("tenant_id","branch_id","kind");--> statement-breakpoint
CREATE INDEX "ix_sessions_user" ON "core_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_user_roles_user" ON "core_user_roles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_tenant_email" ON "core_users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "ix_packages_tenant" ON "sal_packages" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "ix_products_tenant" ON "sal_products" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "ix_prof_tenant" ON "sal_professionals" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_settings_tenant" ON "sal_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_settings_slug" ON "sal_settings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ix_services_tenant" ON "sal_services" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "ix_stock_moves_product" ON "sal_stock_moves" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "ix_client_credits_client" ON "crm_client_credits" USING btree ("tenant_id","client_id","service_id");--> statement-breakpoint
CREATE INDEX "ix_client_notes_client" ON "crm_client_notes" USING btree ("tenant_id","client_id","note_date");--> statement-breakpoint
CREATE INDEX "ix_clients_tenant_name" ON "crm_clients" USING btree ("tenant_id","full_name");--> statement-breakpoint
CREATE INDEX "ix_clients_tenant_phone" ON "crm_clients" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "ix_clients_last_visit" ON "crm_clients" USING btree ("tenant_id","last_visit_at");--> statement-breakpoint
CREATE INDEX "ix_blocks_day" ON "agd_blocks" USING btree ("tenant_id","starts_at");--> statement-breakpoint
CREATE INDEX "ix_appt_day" ON "agd_appointments" USING btree ("tenant_id","starts_at");--> statement-breakpoint
CREATE INDEX "ix_appt_prof_day" ON "agd_appointments" USING btree ("tenant_id","professional_id","starts_at");--> statement-breakpoint
CREATE INDEX "ix_appt_client" ON "agd_appointments" USING btree ("tenant_id","client_id","starts_at");--> statement-breakpoint
CREATE INDEX "ix_waitlist_tenant" ON "agd_waitlist" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "ix_cash_moves_session" ON "pos_cash_moves" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "ix_cash_sessions_tenant" ON "pos_cash_sessions" USING btree ("tenant_id","opened_at");--> statement-breakpoint
CREATE INDEX "ix_comm_closings" ON "pos_commission_closings" USING btree ("tenant_id","professional_id","from_date");--> statement-breakpoint
CREATE INDEX "ix_order_items_order" ON "pos_order_items" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "ix_order_items_prof" ON "pos_order_items" USING btree ("tenant_id","professional_id");--> statement-breakpoint
CREATE INDEX "ix_orders_tenant_date" ON "pos_orders" USING btree ("tenant_id","service_date");--> statement-breakpoint
CREATE INDEX "ix_orders_client" ON "pos_orders" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "ix_orders_status" ON "pos_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "ix_payments_order" ON "pos_payments" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "ix_payments_session" ON "pos_payments" USING btree ("tenant_id","cash_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_automation_kind" ON "mkt_automations" USING btree ("tenant_id","kind");--> statement-breakpoint
CREATE INDEX "ix_campaigns_tenant" ON "mkt_campaigns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "ix_messages_campaign" ON "mkt_messages" USING btree ("tenant_id","campaign_id","status");--> statement-breakpoint
CREATE INDEX "ix_messages_client" ON "mkt_messages" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "ix_messages_queue" ON "mkt_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ix_redemptions_voucher" ON "mkt_voucher_redemptions" USING btree ("tenant_id","voucher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_voucher_code" ON "mkt_vouchers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "ix_voucher_campaign" ON "mkt_vouchers" USING btree ("tenant_id","campaign_id");--> statement-breakpoint
CREATE INDEX "ix_voucher_client" ON "mkt_vouchers" USING btree ("tenant_id","client_id");