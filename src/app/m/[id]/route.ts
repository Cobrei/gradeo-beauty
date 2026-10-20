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
  const [m] = await withTenantRead(actor, (tx) => tx.select().from(messages).where(eq(messages.id, id)).limit(1));
  if (!m) return NextResponse.redirect(new URL("/mensagens", _req.url));
  if (m.status === "QUEUED") await markManualSent(actor, id);
  return NextResponse.redirect(waLink(m.to, m.body));
}
