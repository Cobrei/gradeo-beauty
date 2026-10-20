import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { baseCols } from "./_common";

/** Horário de funcionamento: 0=domingo..6=sábado. */
export type OpeningHours = Record<string, { open: string; close: string } | null>;

/** Configuração do salão (1 por tenant). O slug é o endereço público de agendamento. */
export const salonSettings = pgTable(
  "sal_settings",
  {
    ...baseCols,
    slug: varchar("slug", { length: 48 }).notNull(),
    segment: varchar("segment", { length: 24 }).notNull().default("SALAO"), // SALAO, BARBEARIA, ESTETICA, UNHAS, SOBRANCELHA, SPA
    phone: varchar("phone", { length: 20 }),
    whatsapp: varchar("whatsapp", { length: 20 }),
    instagram: varchar("instagram", { length: 60 }),
    addressJson: jsonb("address_json"),
    openingHours: jsonb("opening_hours").$type<OpeningHours>().notNull().default({}),
    slotMinutes: integer("slot_minutes").notNull().default(15),
    onlineBooking: boolean("online_booking").notNull().default(true),
    onlineBookingLeadMin: integer("online_booking_lead_min").notNull().default(60),
    reviewUrl: text("review_url"),
    messageProvider: varchar("message_provider", { length: 16 }).notNull().default("MANUAL"), // MANUAL, WA_CLOUD
    messageSenderName: varchar("message_sender_name", { length: 60 }),
    // WhatsApp oficial do próprio salão (preenchido pela conexão com a Meta; nunca digitado à mão)
    waPhoneNumberId: varchar("wa_phone_number_id", { length: 40 }),
    waBusinessAccountId: varchar("wa_business_account_id", { length: 40 }),
    waAccessToken: text("wa_access_token"),
    waDisplayPhone: varchar("wa_display_phone", { length: 20 }),
    waConnectedAt: timestamp("wa_connected_at", { withTimezone: true }),
    // WhatsApp por QR code (servidor da gradeo; uma instância por salão)
    waQrInstance: varchar("wa_qr_instance", { length: 80 }),
    waQrConnectedAt: timestamp("wa_qr_connected_at", { withTimezone: true }),
    waQrPhone: varchar("wa_qr_phone", { length: 20 }),
    waQrTermsAcceptedAt: timestamp("wa_qr_terms_accepted_at", { withTimezone: true }),
    waQrTermsAcceptedBy: uuid("wa_qr_terms_accepted_by"),
    // marca do salão: logo (imagem reduzida, data URL) e cor de destaque
    logoData: text("logo_data"),
    brandColor: varchar("brand_color", { length: 7 }),
    /** Lei do Salão-Parceiro (13.352/2016): mostra CNPJ do profissional e o relatório de cota-parte. */
    partnerMode: boolean("partner_mode").notNull().default(false),
    onboardingDone: boolean("onboarding_done").notNull().default(false),
  },
  (t) => [uniqueIndex("uq_settings_tenant").on(t.tenantId), uniqueIndex("uq_settings_slug").on(t.slug)],
);

/** Quem atende. Pode ou não ter login (user_id). */
export const professionals = pgTable(
  "sal_professionals",
  {
    ...baseCols,
    userId: uuid("user_id"),
    name: varchar("name", { length: 120 }).notNull(),
    nickname: varchar("nickname", { length: 40 }),
    phone: varchar("phone", { length: 20 }),
    color: varchar("color", { length: 7 }).notNull().default("#b8475f"),
    commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("40.00"),
    productCommissionPct: numeric("product_commission_pct", { precision: 5, scale: 2 }).notNull().default("10.00"),
    /** 0..6 → {start,end} ou null (folga). Vazio = segue o salão. */
    workingHours: jsonb("working_hours").$type<OpeningHours>().notNull().default({}),
    serviceIds: jsonb("service_ids").$type<string[]>().notNull().default([]), // vazio = todos
    acceptsOnline: boolean("accepts_online").notNull().default(true),
    cnpj: varchar("cnpj", { length: 18 }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("ix_prof_tenant").on(t.tenantId, t.isActive)],
);

export const services = pgTable(
  "sal_services",
  {
    ...baseCols,
    name: varchar("name", { length: 120 }).notNull(),
    category: varchar("category", { length: 40 }).notNull().default("Geral"),
    durationMin: integer("duration_min").notNull().default(60),
    price: numeric("price", { precision: 19, scale: 4 }).notNull().default("0"),
    cost: numeric("cost", { precision: 19, scale: 4 }).notNull().default("0"),
    commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }), // null = usa a do profissional
    /** Intervalo típico de retorno em dias (ex.: coloração 35). Alimenta "atrasadas no ciclo". */
    returnIntervalDays: integer("return_interval_days"),
    onlineBooking: boolean("online_booking").notNull().default(true),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("ix_services_tenant").on(t.tenantId, t.isActive)],
);

export const products = pgTable(
  "sal_products",
  {
    ...baseCols,
    name: varchar("name", { length: 120 }).notNull(),
    brand: varchar("brand", { length: 60 }),
    sku: varchar("sku", { length: 40 }),
    unit: varchar("unit", { length: 8 }).notNull().default("un"),
    salePrice: numeric("sale_price", { precision: 19, scale: 4 }).notNull().default("0"),
    costPrice: numeric("cost_price", { precision: 19, scale: 4 }).notNull().default("0"),
    stockQty: numeric("stock_qty", { precision: 12, scale: 3 }).notNull().default("0"),
    minStock: numeric("min_stock", { precision: 12, scale: 3 }).notNull().default("0"),
    /** Insumo (usado no serviço) ou revenda. */
    forSale: boolean("for_sale").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("ix_products_tenant").on(t.tenantId, t.isActive)],
);

export const stockMoves = pgTable(
  "sal_stock_moves",
  {
    ...baseCols,
    productId: uuid("product_id").notNull().references(() => products.id),
    kind: varchar("kind", { length: 12 }).notNull(), // IN, OUT, SALE, USE, ADJUST
    qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 19, scale: 4 }),
    reason: varchar("reason", { length: 120 }),
    orderId: uuid("order_id"),
  },
  (t) => [index("ix_stock_moves_product").on(t.tenantId, t.productId)],
);

/** Pacote: N créditos de serviços por um preço. */
export const packages = pgTable(
  "sal_packages",
  {
    ...baseCols,
    name: varchar("name", { length: 120 }).notNull(),
    items: jsonb("items").$type<{ serviceId: string; qty: number }[]>().notNull().default([]),
    price: numeric("price", { precision: 19, scale: 4 }).notNull().default("0"),
    validityDays: integer("validity_days").notNull().default(90),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("ix_packages_tenant").on(t.tenantId, t.isActive)],
);
