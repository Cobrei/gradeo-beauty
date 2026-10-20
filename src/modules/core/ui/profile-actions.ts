"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { users } from "@/db/schema";
import { withTenantTx } from "@/lib/context";
import { requireActor } from "../application/auth";

/** Cada pessoa escolhe como quer ser chamada no sistema. */
export async function saveNicknameAction(fd: FormData) {
  const actor = await requireActor();
  const nick = String(fd.get("nickname") ?? "").trim().slice(0, 60) || null;
  await withTenantTx(actor, (tx, ctx) => tx.update(users).set({ nickname: nick, ...ctx.stampUpdate() }).where(eq(users.id, actor.userId)));
  revalidatePath("/", "layout");
  redirect("/painel?salvo=perfil");
}
