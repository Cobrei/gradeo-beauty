"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError, type ActionResult } from "@/lib/errors";
import { toCents } from "@/lib/money";
import { addCashMove, addItem, applyVoucher, cancelOrder, closeCashSession, openCashSession, openOrder, payOrder, removeItem, removeVoucher, setDiscount } from "../application/orders";
import { closeCommission, markClosingPaid, setClosingNf } from "../application/commissions";

const money = (v: FormDataEntryValue | null) => toCents(String(v || "0"));

export async function openOrderAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  let id: string;
  try {
    const actor = await requireActor();
    id = await openOrder(actor, { clientId: (fd.get("clientId") as string) || null, walkInName: (fd.get("walkInName") as string) || null, appointmentIds: fd.getAll("appointmentId").map(String).filter(Boolean) });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/comandas");
  redirect(`/comandas/${id}`);
}

export async function addItemAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const orderId = String(fd.get("orderId"));
  try {
    const actor = await requireActor();
    await addItem(actor, orderId, {
      kind: String(fd.get("kind")) as "SERVICE" | "PRODUCT" | "PACKAGE",
      refId: String(fd.get("refId")),
      professionalId: (fd.get("professionalId") as string) || null,
      qty: Number(String(fd.get("qty") || "1").replace(",", ".")),
      unitPrice: fd.get("unitPrice") ? money(fd.get("unitPrice")) : undefined,
      useCredit: fd.get("useCredit") === "on",
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath(`/comandas/${orderId}`);
  redirect(`/comandas/${orderId}`);
}

export async function removeItemAction(fd: FormData) {
  const orderId = String(fd.get("orderId"));
  const actor = await requireActor();
  await removeItem(actor, orderId, String(fd.get("itemId")));
  revalidatePath(`/comandas/${orderId}`);
  redirect(`/comandas/${orderId}`);
}

export async function discountAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const orderId = String(fd.get("orderId"));
  try {
    const actor = await requireActor();
    await setDiscount(actor, orderId, money(fd.get("amount")), (fd.get("reason") as string) || undefined);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath(`/comandas/${orderId}`);
  redirect(`/comandas/${orderId}`);
}

export async function voucherAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const orderId = String(fd.get("orderId"));
  try {
    const actor = await requireActor();
    if (fd.get("remove")) await removeVoucher(actor, orderId);
    else await applyVoucher(actor, orderId, String(fd.get("code")));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath(`/comandas/${orderId}`);
  redirect(`/comandas/${orderId}`);
}

export async function payAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const orderId = String(fd.get("orderId"));
  try {
    const actor = await requireActor();
    const methods = ["PIX", "CASH", "CREDIT", "DEBIT", "TRANSFER", "OTHER"];
    const pays = methods.map((m) => ({ method: m, amount: money(fd.get(`pay_${m}`)), installments: Number(fd.get(`inst_${m}`) || 1) })).filter((p) => p.amount > 0);
    await payOrder(actor, orderId, pays);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/comandas");
  revalidatePath("/agenda");
  revalidatePath("/clientes");
  redirect(`/comandas/${orderId}?pago=1`);
}

export async function cancelOrderAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const orderId = String(fd.get("orderId"));
  try {
    const actor = await requireActor();
    await cancelOrder(actor, orderId, String(fd.get("reason") || "cancelada"));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/comandas");
  redirect("/comandas");
}

export async function openCashAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    await openCashSession(actor, money(fd.get("openingAmount")));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/caixa");
  redirect("/caixa");
}

export async function cashMoveAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    await addCashMove(actor, String(fd.get("sessionId")), String(fd.get("kind")) as "IN" | "OUT", money(fd.get("amount")), String(fd.get("description") || ""));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/caixa");
  redirect("/caixa");
}

export async function closeCashAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    await closeCashSession(actor, String(fd.get("sessionId")), money(fd.get("closingAmount")), (fd.get("notes") as string) || undefined);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/caixa");
  redirect("/caixa?fechado=1");
}

export async function closeCommissionAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const from = String(fd.get("from"));
  const to = String(fd.get("to"));
  try {
    const actor = await requireActor();
    await closeCommission(actor, String(fd.get("professionalId")), from, to, money(fd.get("adjustments")));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/comissoes");
  redirect(`/comissoes?de=${from}&ate=${to}`);
}

export async function markClosingPaidAction(fd: FormData) {
  const actor = await requireActor();
  await markClosingPaid(actor, String(fd.get("id")));
  revalidatePath("/comissoes");
  redirect("/comissoes?aba=fechamentos");
}

export async function removeVoucherAction(fd: FormData) {
  const orderId = String(fd.get("orderId"));
  const actor = await requireActor();
  await removeVoucher(actor, orderId);
  revalidatePath(`/comandas/${orderId}`);
  redirect(`/comandas/${orderId}`);
}

export async function setClosingNfAction(fd: FormData) {
  const actor = await requireActor();
  const clear = fd.get("clear") === "1";
  await setClosingNf(actor, String(fd.get("id")), clear ? null : String(fd.get("nf") ?? "") || "s/n");
  revalidatePath("/comissoes");
  redirect("/comissoes?aba=fechamentos");
}
