import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { messages } from "@/db/schema";
import { withTenantRead } from "@/lib/context";
import { getActor } from "@/modules/core/application/auth";
import { markManualSent } from "@/modules/marketing/application/campaigns";
import { waLink } from "@/modules/marketing/infrastructure/provider";

/** Modo manual: abre o WhatsApp com a mensagem pronta e marca como enviada. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.redirect(new URL("/login", _req.url));
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL("/mensagens", _req.url));
  const [m] = await withTenantRead(actor, (tx) => tx.select().from(messages).where(eq(messages.id, id)).limit(1));
  if (!m) return NextResponse.redirect(new URL("/mensagens", _req.url));
  // Só marca como enviada quando o clique veio de dentro do próprio sistema (nunca por link externo ou pré-carregamento).
  const site = _req.headers.get("sec-fetch-site");
  const purpose = _req.headers.get("purpose") ?? _req.headers.get("sec-purpose");
  const fromApp = (!site || site === "same-origin") && !purpose;
  if (fromApp && m.status === "QUEUED") {
    try {
      await markManualSent(actor, id);
    } catch {
      return NextResponse.redirect(new URL("/mensagens?erro=permissao", _req.url));
    }
  }
  return NextResponse.redirect(waLink(m.to, m.body));
}
