import { getActor } from "@/modules/core/application/auth";
import { availableSlots } from "@/modules/agenda/application/use-cases";
import { can } from "@/lib/context";

const UUID = /^[0-9a-f-]{36}$/i;

/** Horários livres de uma profissional para um serviço num dia (tela de novo agendamento). */
export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor || !can(actor, "agenda.appointment.write")) return Response.json({ slots: [] }, { status: 401 });
  const u = new URL(req.url);
  const d = u.searchParams.get("d") ?? "";
  const pro = u.searchParams.get("pro") ?? "";
  const s = u.searchParams.get("s") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !UUID.test(pro) || !UUID.test(s)) return Response.json({ slots: [] }, { status: 400 });
  const slots = await availableSlots(actor.tenantId, d, pro, s);
  return Response.json({ slots }, { headers: { "Cache-Control": "no-store" } });
}
