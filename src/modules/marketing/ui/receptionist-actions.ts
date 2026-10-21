"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError, type ActionResult } from "@/lib/errors";
import { resolveConversation, saveReceptionistSettings } from "../application/receptionist";

export async function saveReceptionistAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    await saveReceptionistSettings(actor, {
      on: fd.get("on") === "on",
      name: String(fd.get("name") ?? ""),
      instructions: String(fd.get("instructions") ?? ""),
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/recepcionista");
  redirect("/recepcionista?salvo=1");
}

export async function resolveConversationAction(fd: FormData) {
  const actor = await requireActor();
  const id = String(fd.get("id") ?? "");
  await resolveConversation(actor, id);
  revalidatePath("/recepcionista");
  redirect(`/recepcionista?c=${id}`);
}
