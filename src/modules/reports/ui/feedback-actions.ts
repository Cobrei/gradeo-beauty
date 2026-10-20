"use server";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { markFeedbackHandled } from "../application/feedback";

export async function markFeedbackHandledAction(fd: FormData) {
  const actor = await requireActor();
  await markFeedbackHandled(actor, String(fd.get("id") ?? ""));
  revalidatePath("/painel");
}
