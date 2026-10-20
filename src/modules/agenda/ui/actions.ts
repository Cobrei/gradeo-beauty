"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError, type ActionResult } from "@/lib/errors";
import { addBlock, addToWaitlist, createAppointment, removeBlock, rescheduleAppointment, setWaitlistStatus, transitionAppointment } from "../application/use-cases";

export async function createAppointmentAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const date = String(fd.get("date"));
  let back = `/agenda?d=${date}`;
  try {
    const actor = await requireActor();
    const r = await createAppointment(actor, {
      clientId: fd.get("clientId") || "",
      walkInName: fd.get("walkInName") || undefined,
      newClientPhone: fd.get("newClientPhone") || undefined,
      professionalId: fd.get("professionalId"),
      serviceId: fd.get("serviceId"),
      date,
      time: fd.get("time"),
      durationMin: fd.get("durationMin") || undefined,
      price: fd.get("price") || undefined,
      notes: fd.get("notes") || undefined,
      source: fd.get("source") || "APP",
      force: fd.get("force") === "on",
    });
    if (r.conflict) back += "&aviso=encaixe";
    const ret = fd.get("return");
    if (ret) back = String(ret);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/agenda");
  redirect(back);
}

export async function transitionAction(fd: FormData) {
  const id = String(fd.get("id"));
  const to = String(fd.get("to"));
  const back = String(fd.get("return") || "/agenda");
  const actor = await requireActor();
  try {
    await transitionAppointment(actor, id, to, (fd.get("reason") as string) || undefined);
  } catch (e) {
    const r = toActionError(e);
    revalidatePath("/agenda");
    redirect(`${back}${back.includes("?") ? "&" : "?"}erro=${encodeURIComponent(r.ok ? "" : r.message)}`);
  }
  revalidatePath("/agenda");
  if (to === "DONE") redirect(`/comandas/nova?atendimento=${id}`);
  if (to === "CONFIRMED" || to === "IN_SERVICE") redirect(`/agenda/${id}`);
  redirect(back);
}

export async function rescheduleAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const id = String(fd.get("id"));
  const date = String(fd.get("date"));
  try {
    const actor = await requireActor();
    await rescheduleAppointment(actor, id, { date, time: String(fd.get("time")), professionalId: (fd.get("professionalId") as string) || undefined });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/agenda");
  redirect(`/agenda?d=${date}`);
}

export async function addBlockAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const date = String(fd.get("date"));
  try {
    const actor = await requireActor();
    await addBlock(actor, { professionalId: (fd.get("professionalId") as string) || undefined, date, from: String(fd.get("from")), to: String(fd.get("to")), reason: (fd.get("reason") as string) || undefined });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/agenda");
  redirect(`/agenda?d=${date}`);
}

export async function removeBlockAction(fd: FormData) {
  const actor = await requireActor();
  await removeBlock(actor, String(fd.get("id")));
  revalidatePath("/agenda");
  redirect(`/agenda?d=${fd.get("date")}`);
}

export async function addToWaitlistAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    await addToWaitlist(actor, {
      clientId: String(fd.get("clientId")),
      serviceId: String(fd.get("serviceId")),
      professionalId: (fd.get("professionalId") as string) || undefined,
      fromDate: String(fd.get("fromDate")),
      toDate: String(fd.get("toDate")),
      periodPref: (fd.get("periodPref") as string) || "ANY",
      note: (fd.get("note") as string) || undefined,
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/agenda/espera");
  redirect("/agenda/espera");
}

export async function waitlistStatusAction(fd: FormData) {
  const actor = await requireActor();
  await setWaitlistStatus(actor, String(fd.get("id")), String(fd.get("status")) as "NOTIFIED" | "BOOKED" | "EXPIRED");
  revalidatePath("/agenda/espera");
  redirect("/agenda/espera");
}
