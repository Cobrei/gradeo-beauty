import { getActor } from "@/modules/core/application/auth";
import { listClients } from "@/modules/crm/application/use-cases";
import { can } from "@/lib/context";

/** Busca de clientes enquanto digita (nome, telefone ou e-mail). Quem começa com o texto vem primeiro. */
export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor || !can(actor, "crm.client.read")) return Response.json({ rows: [] }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ rows: [] });
  const { rows } = await listClients(actor, { q, limit: 12 });
  const low = q.toLowerCase();
  const sorted = [...rows].sort((a, b) => Number(!a.fullName.toLowerCase().startsWith(low)) - Number(!b.fullName.toLowerCase().startsWith(low)));
  return Response.json(
    { rows: sorted.slice(0, 8).map((r) => ({ id: r.id, fullName: r.fullName, phone: r.phone, visitsCount: r.visitsCount })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
