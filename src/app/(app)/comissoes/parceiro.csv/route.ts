import { requireActor } from "@/modules/core/application/auth";
import { partnerReport } from "@/modules/pos/application/commissions";
import { formatCnpj } from "@/lib/cnpj";
import { firstOfMonth, lastOfMonth, todayISO } from "@/lib/dates";

const iso = (v: string | null, d: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : d);
const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export async function GET(req: Request) {
  const actor = await requireActor();
  const url = new URL(req.url);
  const today = todayISO();
  const from = iso(url.searchParams.get("de"), firstOfMonth(today));
  const to = iso(url.searchParams.get("ate"), lastOfMonth(today));
  const rows = await partnerReport(actor, from, to);
  const head = ["Profissional", "CNPJ", "Servicos (R$)", "Produtos (R$)", "Total recebido (R$)", "Cota-parte do profissional (R$)", "Cota-parte do salao (R$)"];
  const lines = rows.map((r) => [r.professionalName, formatCnpj(r.cnpj), money(r.services), money(r.products), money(r.gross), money(r.partnerShare), money(r.salonShare)]);
  const csv = "﻿" + [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="salao-parceiro-${from}-a-${to}.csv"` } });
}
