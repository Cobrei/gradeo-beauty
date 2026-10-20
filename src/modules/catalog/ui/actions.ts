"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError, type ActionResult } from "@/lib/errors";
import { toCents } from "@/lib/money";
import { bulkUpdateServices, moveStock, savePackage, saveProduct, saveService } from "../application/use-cases";

const on = (v: FormDataEntryValue | null) => v === "on" || v === "true" || v === "1";

export async function saveServiceAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const id = (fd.get("id") as string) || null;
  try {
    const actor = await requireActor();
    await saveService(actor, id, {
      name: fd.get("name"),
      category: fd.get("category") || "Geral",
      durationMin: fd.get("durationMin"),
      price: fd.get("price"),
      cost: fd.get("cost") || 0,
      commissionPct: fd.get("commissionPct") ?? "",
      returnIntervalDays: fd.get("returnIntervalDays") ?? "",
      onlineBooking: on(fd.get("onlineBooking")),
      description: fd.get("description") || undefined,
      isActive: fd.get("isActive") == null ? true : on(fd.get("isActive")),
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/servicos");
  redirect("/servicos");
}

export async function saveProductAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const id = (fd.get("id") as string) || null;
  try {
    const actor = await requireActor();
    await saveProduct(actor, id, {
      name: fd.get("name"),
      brand: fd.get("brand") || undefined,
      sku: fd.get("sku") || undefined,
      unit: fd.get("unit") || "un",
      salePrice: fd.get("salePrice"),
      costPrice: fd.get("costPrice") || 0,
      minStock: fd.get("minStock") || 0,
      forSale: fd.get("forSale") == null ? true : on(fd.get("forSale")),
      isActive: fd.get("isActive") == null ? true : on(fd.get("isActive")),
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function moveStockAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const productId = String(fd.get("productId"));
  try {
    const actor = await requireActor();
    const unitCost = fd.get("unitCost") ? toCents(String(fd.get("unitCost"))) : undefined;
    await moveStock(actor, { productId, kind: String(fd.get("kind")) as "IN" | "OUT" | "USE" | "ADJUST", qty: Number(String(fd.get("qty")).replace(",", ".")), unitCost, reason: (fd.get("reason") as string) || undefined });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/produtos");
  redirect(`/produtos/${productId}`);
}

export async function savePackageAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const id = (fd.get("id") as string) || null;
  try {
    const actor = await requireActor();
    const items = fd
      .getAll("serviceId")
      .map((sid, i) => ({ serviceId: String(sid), qty: Number(fd.getAll("qty")[i] ?? 1) }))
      .filter((x) => x.serviceId && x.qty > 0);
    await savePackage(actor, id, { name: fd.get("name"), price: fd.get("price"), validityDays: fd.get("validityDays") || 90, items, isActive: fd.get("isActive") == null ? true : on(fd.get("isActive")) });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/pacotes");
  redirect("/pacotes");
}

export async function bulkServicesAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  try {
    const actor = await requireActor();
    const ids = fd.getAll("id").map(String);
    await bulkUpdateServices(actor, ids.map((id) => ({ id, price: String(fd.get(`price_${id}`) ?? "0"), durationMin: Number(fd.get(`dur_${id}`)) })));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/servicos");
  redirect("/servicos?salvo=precos");
}
