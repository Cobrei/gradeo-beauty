/**
 * Seed de demonstração: um salão com equipe, serviços, 48 clientes com histórico
 * de 6 meses (comandas pagas), agenda de hoje/amanhã, produtos, pacote e uma campanha.
 * Idempotente pelo e-mail da dona.
 */
import { eq, sql } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { db, rawSql } from "./client";
import { appointments, automations, campaigns, clientNotes, clients, orderItems, orders, packages, payments, products, professionals, roles, salonSettings, services, tenants, userRoles, users, vouchers } from "./schema";
import { SYSTEM_ROLES } from "../lib/permissions";
import { DEFAULT_AUTOMATIONS, DEFAULT_HOURS, SEGMENTS } from "../modules/catalog/domain/presets";
import { fromCents } from "../lib/money";
import { todayISO } from "../lib/dates";
import { addDays, localToDate, addMinutes } from "../lib/time";

const OWNER_EMAIL = "dona@salao.demo";
const PASSWORD = "gradeo123";
const TODAY = todayISO();

// gerador determinístico
let seedN = 42;
const rnd = () => ((seedN = (seedN * 9301 + 49297) % 233280) / 233280);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

const FIRST = ["Ana", "Beatriz", "Camila", "Daniela", "Eduarda", "Fernanda", "Gabriela", "Helena", "Isabela", "Juliana", "Larissa", "Mariana", "Natália", "Patrícia", "Rafaela", "Sabrina", "Tatiane", "Vanessa", "Bruna", "Carolina", "Débora", "Elisa", "Flávia", "Giovana", "Luana", "Michele", "Priscila", "Renata", "Simone", "Thaís", "Letícia", "Amanda", "Aline", "Cristiane", "Jéssica", "Marcela", "Paula", "Roberta", "Sandra", "Viviane", "Bianca", "Cláudia", "Laura", "Lívia", "Manuela", "Raquel", "Sofia", "Valentina"];
const LAST = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes", "Martins", "Rocha", "Ribeiro", "Alves", "Monteiro", "Mendes", "Barros", "Freitas", "Cardoso", "Schmidt", "Mueller", "Weber"];

async function main() {
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, OWNER_EMAIL));
  if (exists.length) {
    console.log("seed já aplicado");
    await rawSql.end();
    return;
  }
  const [t] = await db.insert(tenants).values({ name: "Studio Bela Demo" }).returning();
  await db.execute(sql`select set_config('app.tenant_id', ${t.id}, false)`);
  const T = { tenantId: t.id };
  const passwordHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const roleIds: Record<string, string> = {};
  for (const [code, r] of Object.entries(SYSTEM_ROLES)) {
    const [row] = await db.insert(roles).values({ ...T, code, name: r.name, permissions: r.permissions as string[], isSystem: true }).returning();
    roleIds[code] = row.id;
  }
  const mk = async (name: string, email: string, role: string) => {
    const [u] = await db.insert(users).values({ ...T, name, email, passwordHash }).returning();
    await db.insert(userRoles).values({ ...T, userId: u.id, roleId: roleIds[role] });
    return u;
  };
  const owner = await mk("Bela Andrade", OWNER_EMAIL, "OWNER");
  const recep = await mk("Recepção Carla", "recepcao@salao.demo", "RECEPTION");
  const proUser = await mk("Júlia Mendes", "julia@salao.demo", "PROFESSIONAL");
  void recep;

  await db.insert(salonSettings).values({ ...T, slug: "studio-bela", segment: "SALAO", whatsapp: "51999990000", phone: "5133330000", instagram: "studiobela", addressJson: { text: "Rua Padre Chagas, 300 · Moinhos de Vento · Porto Alegre" }, openingHours: DEFAULT_HOURS, messageSenderName: "Studio Bela", onboardingDone: true, reviewUrl: "https://g.page/r/studio-bela/review" });
  await db.insert(automations).values(DEFAULT_AUTOMATIONS.map((a) => ({ ...T, kind: a.kind, enabled: a.enabled, template: a.template, settings: a.settings })));

  const svcRows = await db
    .insert(services)
    .values(SEGMENTS.SALAO.services.map((s, i) => ({ ...T, name: s.name, category: s.category, durationMin: s.durationMin, price: s.price.toFixed(4), returnIntervalDays: s.returnIntervalDays ?? null, sortOrder: i })))
    .returning();
  const svc = (n: string) => svcRows.find((s) => s.name === n)!;

  const pros = await db
    .insert(professionals)
    .values([
      { ...T, name: "Bela Andrade", nickname: "Bela", color: "#b8475f", commissionPct: "50.00", userId: owner.id, sortOrder: 0 },
      { ...T, name: "Júlia Mendes", nickname: "Júlia", color: "#5b6fb5", commissionPct: "40.00", userId: proUser.id, sortOrder: 1 },
      { ...T, name: "Renata Lopes", nickname: "Rê", color: "#2f9a78", commissionPct: "45.00", serviceIds: [svc("Manicure").id, svc("Pedicure").id, svc("Design de sobrancelha").id], sortOrder: 2 },
    ])
    .returning();

  await db.insert(products).values([
    { ...T, name: "Shampoo Reconstrutor 300ml", brand: "Wella", salePrice: "89.9000", costPrice: "45.0000", stockQty: "12", minStock: "4" },
    { ...T, name: "Máscara Hidratante 500g", brand: "Kérastase", salePrice: "189.0000", costPrice: "98.0000", stockQty: "3", minStock: "4" },
    { ...T, name: "Óleo Finalizador 100ml", brand: "Truss", salePrice: "120.0000", costPrice: "62.0000", stockQty: "8", minStock: "3" },
    { ...T, name: "Coloração tubo 60g", brand: "Igora", salePrice: "0", costPrice: "28.0000", stockQty: "40", minStock: "15", forSale: false },
    { ...T, name: "Oxidante 20 vol 900ml", brand: "Igora", salePrice: "0", costPrice: "35.0000", stockQty: "6", minStock: "2", forSale: false },
  ]);
  await db.insert(packages).values({ ...T, name: "10 escovas", items: [{ serviceId: svc("Escova").id, qty: 10 }], price: "560.0000", validityDays: 120 });

  // Clientes com perfis variados
  const clientRows: { id: string; name: string; phone: string; profile: string }[] = [];
  const profiles = ["fiel", "fiel", "fiel", "ciclo", "ciclo", "sumida", "sumida", "uma", "nova", "vip"];
  for (let i = 0; i < 48; i++) {
    const name = `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
    const phone = `5199${String(100000 + i * 731).padStart(6, "0")}`;
    const profile = profiles[i % profiles.length];
    const birth = `${1975 + Math.floor(rnd() * 28)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`;
    const bday = i % 7 === 0 ? `${birth.slice(0, 5)}${TODAY.slice(5)}` : birth; // alguns aniversariantes hoje/este mês
    const [c] = await db
      .insert(clients)
      .values({ ...T, fullName: name, phone, email: `${FIRST[i % FIRST.length].toLowerCase()}${i}@email.com`, birthDate: i % 3 === 0 ? bday : null, gender: "F", source: i % 5 === 0 ? "ONLINE" : "MANUAL", tags: profile === "vip" ? ["vip"] : [], preferredProfessionalId: pick(pros).id, marketingOptIn: new Date(), marketingOptOut: i === 11 ? new Date() : null })
      .returning({ id: clients.id });
    clientRows.push({ id: c.id, name, phone, profile });
  }

  // Histórico: comandas pagas nos últimos 180 dias conforme o perfil
  let orderNumber = 0;
  async function paidOrder(clientId: string, date: string, items: { serviceId?: string; productName?: string; proId: string }[]) {
    orderNumber++;
    const [o] = await db.insert(orders).values({ ...T, number: orderNumber, clientId, status: "OPEN", serviceDate: date, subtotal: "0", total: "0" }).returning({ id: orders.id });
    let subtotal = 0;
    for (const it of items) {
      const pro = pros.find((p) => p.id === it.proId)!;
      if (it.serviceId) {
        const s = svcRows.find((x) => x.id === it.serviceId)!;
        const price = Math.round(Number(s.price) * 100);
        const pct = Number(pro.commissionPct);
        await db.insert(orderItems).values({ ...T, orderId: o.id, kind: "SERVICE", refId: s.id, description: s.name, professionalId: pro.id, qty: "1", unitPrice: fromCents(price), total: fromCents(price), commissionPct: pct.toFixed(2), commissionAmount: fromCents(Math.round((price * pct) / 100)) });
        subtotal += price;
        const start = localToDate(date, pick(["09:00", "10:30", "14:00", "16:00"]));
        await db.insert(appointments).values({ ...T, clientId, professionalId: pro.id, serviceId: s.id, startsAt: start, endsAt: addMinutes(start, s.durationMin), status: "DONE", price: fromCents(price), orderId: o.id, source: "APP" });
      }
    }
    const payMethod = pick(["PIX", "PIX", "CREDIT", "DEBIT", "CASH"]);
    await db.insert(payments).values({ ...T, orderId: o.id, method: payMethod, amount: fromCents(subtotal), installments: 1, paidAt: localToDate(date, "15:05") });
    await db.update(orders).set({ subtotal: fromCents(subtotal), total: fromCents(subtotal), status: "PAID", paidAt: localToDate(date, "15:00") }).where(eq(orders.id, o.id));
    await db.execute(sql`
      update crm_clients cl set
        total_spent = total_spent + ${fromCents(subtotal)}::numeric,
        visits_count = visits_count + 1,
        first_visit_at = coalesce(first_visit_at, ${date}::date),
        last_visit_at = greatest(coalesce(last_visit_at, ${date}::date), ${date}::date)
      where cl.id = ${clientId}`);
  }

  const mainSvcs = [svc("Corte feminino"), svc("Escova"), svc("Coloração"), svc("Retoque de raiz"), svc("Hidratação"), svc("Mechas / luzes")];
  const nailPro = pros[2];
  for (const c of clientRows) {
    const pro = pick([pros[0], pros[1]]);
    const visits: string[] = [];
    if (c.profile === "fiel") for (let d = 170; d > 5; d -= 25 + Math.floor(rnd() * 10)) visits.push(addDays(TODAY, -d));
    if (c.profile === "vip") for (let d = 175; d > 3; d -= 14 + Math.floor(rnd() * 6)) visits.push(addDays(TODAY, -d));
    if (c.profile === "ciclo") for (let d = 170; d > 40; d -= 30 + Math.floor(rnd() * 8)) visits.push(addDays(TODAY, -d)); // última há ~45 d, ciclo 30 → atrasada
    if (c.profile === "sumida") for (let d = 180; d > 70; d -= 28) visits.push(addDays(TODAY, -d));
    if (c.profile === "uma") visits.push(addDays(TODAY, -(25 + Math.floor(rnd() * 30))));
    if (c.profile === "nova") visits.push(addDays(TODAY, -(2 + Math.floor(rnd() * 20))));
    for (const v of visits) {
      const items = [{ serviceId: pick(mainSvcs).id, proId: pro.id }];
      if (rnd() < 0.4) items.push({ serviceId: pick([svc("Manicure"), svc("Pedicure"), svc("Design de sobrancelha")]).id, proId: nailPro.id });
      await paidOrder(c.id, v, items);
    }
    if (c.profile === "fiel" || c.profile === "vip") {
      await db.insert(clientNotes).values({ ...T, clientId: c.id, kind: "FORMULA", serviceId: svc("Coloração").id, professionalId: pro.id, text: `${pick(["6.0", "7.1", "8.1", "5.3"])} + ${pick(["7.0", "8.0", "9.1"])} (1:1) ox 20 vol · 35 min · tonalizante ${pick(["9.1", "8.3", "10.1"])}`, noteDate: visits.at(-1) ?? TODAY });
    }
    if (c.profile === "vip") await db.insert(clientNotes).values({ ...T, clientId: c.id, kind: "PREFERENCE", text: "Gosta de café sem açúcar e revista. Não gosta de conversa durante a escova.", noteDate: TODAY });
    if (c.name.startsWith("Helena")) await db.insert(clientNotes).values({ ...T, clientId: c.id, kind: "ALLERGY", text: "Alergia a amônia: usar só coloração sem amônia.", noteDate: TODAY });
  }
  // intervalo médio
  await db.execute(sql`
    update crm_clients cl set avg_interval_days = (
      select case when count(*) > 1 then ((max(d) - min(d)) / (count(*) - 1))::int else null end
      from (select distinct service_date d from pos_orders where client_id = cl.id and status = 'PAID') x)`);

  // Agenda de hoje e amanhã
  const todayPlan: [string, string, number, string][] = [
    ["09:00", "Corte feminino", 0, "DONE"], ["10:00", "Coloração", 0, "IN_SERVICE"], ["14:00", "Escova", 0, "CONFIRMED"], ["16:00", "Mechas / luzes", 0, "SCHEDULED"],
    ["09:30", "Hidratação", 1, "DONE"], ["11:00", "Corte feminino", 1, "CONFIRMED"], ["15:00", "Retoque de raiz", 1, "SCHEDULED"], ["17:30", "Escova", 1, "REQUESTED"],
    ["09:00", "Manicure", 2, "DONE"], ["10:00", "Pedicure", 2, "DONE"], ["13:30", "Design de sobrancelha", 2, "SCHEDULED"], ["15:00", "Manicure", 2, "SCHEDULED"],
  ];
  let ci = 0;
  for (const [time, sname, pi, status] of todayPlan) {
    const s = svc(sname);
    const c = clientRows[(ci++ * 7) % clientRows.length];
    const start = localToDate(TODAY, time);
    await db.insert(appointments).values({ ...T, clientId: c.id, professionalId: pros[pi].id, serviceId: s.id, startsAt: start, endsAt: addMinutes(start, s.durationMin), status, price: s.price, source: status === "REQUESTED" ? "ONLINE" : "APP", confirmedAt: status === "CONFIRMED" ? new Date() : null });
  }
  for (const [time, sname, pi] of [["10:00", "Coloração", 0], ["14:30", "Corte feminino", 1], ["09:00", "Pedicure", 2]] as [string, string, number][]) {
    const s = svc(sname);
    const c = clientRows[(ci++ * 7) % clientRows.length];
    const start = localToDate(addDays(TODAY, 1), time);
    await db.insert(appointments).values({ ...T, clientId: c.id, professionalId: pros[pi].id, serviceId: s.id, startsAt: start, endsAt: addMinutes(start, s.durationMin), status: "SCHEDULED", price: s.price });
  }

  // Voucher genérico + campanha rascunho
  await db.insert(vouchers).values({ ...T, code: "BEMVINDA10", name: "Boas-vindas Instagram", kind: "PERCENT", value: "10", validFrom: TODAY, validUntil: addDays(TODAY, 60), maxUses: 100 });
  await db.insert(campaigns).values({ ...T, name: "Sentimos sua falta · outubro", channel: "WHATSAPP", segment: { preset: "INACTIVE", inactiveDays: 45 }, message: "Oi {nome}! Faz tempo que você não aparece no {salao} e a gente sentiu sua falta 💕 Preparamos {voucher} pra você voltar, válido até {validade}. Quer que eu reserve um horário? Responde aqui!", voucherKind: "PERCENT", voucherValue: "15", voucherDays: 15, status: "DRAFT", audienceCount: 0 });

  console.log(`seed ok: salão demo criado (${clientRows.length} clientes, ${orderNumber} comandas). Login: ${OWNER_EMAIL} / ${PASSWORD}`);
  await rawSql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
