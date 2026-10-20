import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { packages, products, services, stockMoves } from "@/db/schema";
import { assertCan, withTenantRead, withTenantTx, type Actor } from "@/lib/context";
import { DomainError, NotFoundError } from "@/lib/errors";
import { fromCents, toCents } from "@/lib/money";

const money = z.union([z.string(), z.number()]).transform((v) => toCents(String(v || "0")));

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Nome do serviço.").max(120),
  category: z.string().trim().min(1).max(40).default("Geral"),
  durationMin: z.coerce.number().int().min(5).max(600),
  price: money,
  cost: money.default(0),
  commissionPct: z.union([z.literal(""), z.coerce.number().min(0).max(100)]).optional(),
  returnIntervalDays: z.union([z.literal(""), z.coerce.number().int().min(1).max(730)]).optional(),
  onlineBooking: z.boolean().default(true),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
});

export async function listServices(actor: Actor, opts: { includeInactive?: boolean } = {}) {
  return withTenantRead(actor, (tx) =>
    tx
      .select()
      .from(services)
      .where(and(isNull(services.deletedAt), opts.includeInactive ? undefined : eq(services.isActive, true)))
      .orderBy(asc(services.category), asc(services.sortOrder), asc(services.name)),
  );
}

export async function saveService(actor: Actor, id: string | null, raw: unknown) {
  assertCan(actor, "catalog.service.manage");
  const i = serviceSchema.parse(raw);
  const values = {
    name: i.name,
    category: i.category,
    durationMin: i.durationMin,
    price: fromCents(i.price),
    cost: fromCents(i.cost),
    commissionPct: i.commissionPct === "" || i.commissionPct === undefined ? null : String(i.commissionPct),
    returnIntervalDays: i.returnIntervalDays === "" || i.returnIntervalDays === undefined ? null : i.returnIntervalDays,
    onlineBooking: i.onlineBooking,
    description: i.description || null,
    isActive: i.isActive,
  };
  return withTenantTx(actor, async (tx, ctx) => {
    if (id) {
      const [before] = await tx.select().from(services).where(eq(services.id, id)).limit(1);
      if (!before) throw new NotFoundError("service", id);
      await tx.update(services).set({ ...values, ...ctx.stampUpdate() }).where(eq(services.id, id));
      await ctx.audit("service", id, "update", before, values);
      return id;
    }
    const [row] = await tx.insert(services).values({ ...values, ...ctx.stampCreate() }).returning({ id: services.id });
    await ctx.audit("service", row.id, "create", null, values);
    return row.id;
  });
}

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(60).optional(),
  sku: z.string().trim().max(40).optional(),
  unit: z.string().trim().max(8).default("un"),
  salePrice: money,
  costPrice: money.default(0),
  minStock: z.coerce.number().min(0).default(0),
  forSale: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export async function listProducts(actor: Actor, opts: { includeInactive?: boolean } = {}) {
  assertCan(actor, "catalog.product.read");
  return withTenantRead(actor, (tx) =>
    tx
      .select()
      .from(products)
      .where(and(isNull(products.deletedAt), opts.includeInactive ? undefined : eq(products.isActive, true)))
      .orderBy(asc(products.name)),
  );
}

export async function saveProduct(actor: Actor, id: string | null, raw: unknown) {
  assertCan(actor, "catalog.product.manage");
  const i = productSchema.parse(raw);
  const values = { name: i.name, brand: i.brand || null, sku: i.sku || null, unit: i.unit, salePrice: fromCents(i.salePrice), costPrice: fromCents(i.costPrice), minStock: String(i.minStock), forSale: i.forSale, isActive: i.isActive };
  return withTenantTx(actor, async (tx, ctx) => {
    if (id) {
      await tx.update(products).set({ ...values, ...ctx.stampUpdate() }).where(eq(products.id, id));
      return id;
    }
    const [row] = await tx.insert(products).values({ ...values, ...ctx.stampCreate() }).returning({ id: products.id });
    return row.id;
  });
}

/** Entrada, saída, uso interno ou ajuste de estoque. Quantidade sempre positiva; o tipo dá o sinal. */
export async function moveStock(actor: Actor, input: { productId: string; kind: "IN" | "OUT" | "USE" | "ADJUST"; qty: number; unitCost?: number; reason?: string }) {
  assertCan(actor, "catalog.product.manage");
  if (!(input.qty > 0)) throw new DomainError("VALIDATION", "Quantidade deve ser maior que zero.");
  return withTenantTx(actor, async (tx, ctx) => {
    const [p] = await tx.select().from(products).where(eq(products.id, input.productId)).limit(1);
    if (!p) throw new NotFoundError("product", input.productId);
    const delta = input.kind === "IN" ? input.qty : input.kind === "ADJUST" ? input.qty - Number(p.stockQty) : -input.qty;
    await tx.insert(stockMoves).values({ ...ctx.stampCreate(), productId: p.id, kind: input.kind, qty: String(Math.abs(delta)), unitCost: input.unitCost != null ? fromCents(input.unitCost) : null, reason: input.reason ?? null });
    await tx.update(products).set({ stockQty: sql`${products.stockQty} + ${String(delta)}`, ...ctx.stampUpdate(), ...(input.kind === "IN" && input.unitCost != null ? { costPrice: fromCents(input.unitCost) } : {}) }).where(eq(products.id, p.id));
  });
}

export async function listStockMoves(actor: Actor, productId: string) {
  assertCan(actor, "catalog.product.read");
  return withTenantRead(actor, (tx) => tx.select().from(stockMoves).where(eq(stockMoves.productId, productId)).orderBy(sql`${stockMoves.createdAt} desc`).limit(50));
}

export const packageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  price: money,
  validityDays: z.coerce.number().int().min(7).max(730).default(90),
  items: z.array(z.object({ serviceId: z.string().uuid(), qty: z.coerce.number().int().min(1).max(99) })).min(1, "Inclua pelo menos um serviço."),
  isActive: z.boolean().default(true),
});

export async function listPackages(actor: Actor) {
  return withTenantRead(actor, (tx) => tx.select().from(packages).where(and(isNull(packages.deletedAt), eq(packages.isActive, true))).orderBy(asc(packages.name)));
}

export async function savePackage(actor: Actor, id: string | null, raw: unknown) {
  assertCan(actor, "catalog.service.manage");
  const i = packageSchema.parse(raw);
  const values = { name: i.name, price: fromCents(i.price), validityDays: i.validityDays, items: i.items, isActive: i.isActive };
  return withTenantTx(actor, async (tx, ctx) => {
    if (id) {
      await tx.update(packages).set({ ...values, ...ctx.stampUpdate() }).where(eq(packages.id, id));
      return id;
    }
    const [row] = await tx.insert(packages).values({ ...values, ...ctx.stampCreate() }).returning({ id: packages.id });
    return row.id;
  });
}
