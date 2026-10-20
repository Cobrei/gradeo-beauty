"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError, type ActionResult } from "@/lib/errors";
import { assertCan, can } from "@/lib/context";
import { parseReais } from "@/lib/money";
import { createVoucher, deleteDraft, dispatchCampaign, markManualSent, pauseCampaign, prepareCampaign, saveCampaign, setVoucherStatus } from "../application/campaigns";
import { flushAutomationQueue, runAutomationsForTenant } from "../application/automations";
import { setSendDeadline } from "../infrastructure/provider";
import { updateAutomation } from "@/modules/core/application/settings";

export async function saveCampaignAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const id = (fd.get("id") as string) || null;
  let newId: string;
  try {
    const actor = await requireActor();
    const voucherKind = (fd.get("voucherKind") as string) || "";
    newId = await saveCampaign(actor, id, {
      name: fd.get("name"),
      channel: fd.get("channel") || "WHATSAPP",
      segment: {
        preset: fd.get("preset") || "ALL",
        inactiveDays: fd.get("inactiveDays") || undefined,
        gender: fd.get("gender") || undefined,
        serviceId: fd.get("segServiceId") || undefined,
        professionalId: fd.get("segProfessionalId") || undefined,
        tags: String(fd.get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean),
      },
      message: fd.get("message"),
      voucherKind: voucherKind || undefined,
      voucherValue: voucherKind ? fd.get("voucherValue") : undefined,
      voucherDays: voucherKind ? fd.get("voucherDays") || 15 : undefined,
      voucherServiceId: fd.get("voucherServiceId") || undefined,
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/campanhas");
  redirect(`/campanhas/${newId}`);
}

export async function prepareCampaignAction(fd: FormData) {
  const id = String(fd.get("id"));
  const actor = await requireActor();
  await prepareCampaign(actor, id);
  revalidatePath(`/campanhas/${id}`);
  redirect(`/campanhas/${id}`);
}

export async function dispatchCampaignAction(fd: FormData) {
  const id = String(fd.get("id"));
  const actor = await requireActor();
  const r = await dispatchCampaign(actor, id);
  revalidatePath(`/campanhas/${id}`);
  redirect(`/campanhas/${id}?enviados=${r.sent}&falhas=${r.failed}&restam=${r.remaining}`);
}

export async function markSentAction(fd: FormData) {
  const actor = await requireActor();
  await markManualSent(actor, String(fd.get("messageId")));
  const back = String(fd.get("return") || "/campanhas");
  revalidatePath(back);
  redirect(back);
}

export async function pauseCampaignAction(fd: FormData) {
  const id = String(fd.get("id"));
  const actor = await requireActor();
  await pauseCampaign(actor, id, fd.get("paused") === "1");
  revalidatePath(`/campanhas/${id}`);
  redirect(`/campanhas/${id}`);
}

export async function deleteDraftAction(fd: FormData) {
  const actor = await requireActor();
  await deleteDraft(actor, String(fd.get("id")));
  revalidatePath("/campanhas");
  redirect("/campanhas");
}

export async function createVoucherAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    await createVoucher(actor, {
      name: fd.get("name"),
      code: fd.get("code") || "",
      kind: fd.get("kind"),
      value: String(fd.get("value") || "").replace(",", "."),
      minOrder: String(fd.get("minOrder") || "0").replace(",", "."),
      serviceId: fd.get("serviceId") || "",
      validFrom: fd.get("validFrom"),
      validUntil: fd.get("validUntil"),
      maxUses: fd.get("maxUses") || 100,
      clientId: fd.get("clientId") || "",
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/vouchers");
  const ret = (fd.get("return") as string) || "/vouchers";
  redirect(ret);
}

export async function voucherStatusAction(fd: FormData) {
  const actor = await requireActor();
  await setVoucherStatus(actor, String(fd.get("id")), String(fd.get("status")) as "ACTIVE" | "PAUSED" | "EXPIRED");
  revalidatePath("/vouchers");
  redirect("/vouchers");
}

export async function saveAutomationAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    const settings: Record<string, unknown> = {};
    for (const k of ["hoursBefore", "hoursAfter", "inactiveDays", "voucherValue", "voucherDays"]) if (fd.get(k)) settings[k] = k === "voucherValue" ? parseReais(fd.get(k)) : Number(fd.get(k));
    if (fd.get("voucherKind")) settings.voucherKind = String(fd.get("voucherKind"));
    await updateAutomation(actor, String(fd.get("kind")), { enabled: fd.get("enabled") === "on", template: String(fd.get("template") || ""), settings });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/configuracoes/automacoes");
  redirect("/configuracoes/automacoes?salvo=1");
}

export async function runAutomationsNowAction() {
  const actor = await requireActor();
  if (!can(actor, "mkt.message.send")) assertCan(actor, "mkt.campaign.manage");
  setSendDeadline(45_000);
  const r = await runAutomationsForTenant(actor.tenantId);
  revalidatePath("/mensagens");
  redirect(`/mensagens?rodou=${encodeURIComponent(JSON.stringify(r))}`);
}

/** Envia agora, pelo WhatsApp conectado do salão, o que está na fila. */
export async function flushQueueAction() {
  const actor = await requireActor();
  if (!can(actor, "mkt.message.send")) assertCan(actor, "mkt.campaign.manage");
  setSendDeadline(45_000);
  const r = await flushAutomationQueue(actor);
  revalidatePath("/mensagens");
  redirect(`/mensagens?enviou=${r.sent}&falhou=${r.failed}&resta=${r.remaining}`);
}
