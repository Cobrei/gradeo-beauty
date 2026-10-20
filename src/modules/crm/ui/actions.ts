"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError, type ActionResult } from "@/lib/errors";
import { addNote, importClients, saveClient, setMarketingOptOut, type ImportRow } from "../application/use-cases";
import { parseCsv } from "../domain/csv";

export async function saveClientAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const id = (fd.get("id") as string) || null;
  let newId: string;
  try {
    const actor = await requireActor();
    newId = await saveClient(actor, id, {
      fullName: fd.get("fullName"),
      phone: fd.get("phone") || undefined,
      email: fd.get("email") || "",
      birthDate: fd.get("birthDate") || "",
      gender: fd.get("gender") || "N",
      cpf: fd.get("cpf") || undefined,
      notes: fd.get("notes") || undefined,
      tags: String(fd.get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean),
      source: fd.get("source") || "MANUAL",
      preferredProfessionalId: fd.get("preferredProfessionalId") || "",
      marketingOptIn: fd.get("marketingOptIn") == null ? true : fd.get("marketingOptIn") === "on",
    });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/clientes");
  const ret = fd.get("return") as string | null;
  redirect(ret ? `${ret}${ret.includes("?") ? "&" : "?"}c=${newId}&cn=${encodeURIComponent(String(fd.get("fullName")))}` : `/clientes/${newId}`);
}

export async function addNoteAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  const clientId = String(fd.get("clientId"));
  try {
    const actor = await requireActor();
    await addNote(actor, { clientId, kind: fd.get("kind") || "NOTE", text: fd.get("text"), serviceId: fd.get("serviceId") || "", professionalId: fd.get("professionalId") || "", noteDate: fd.get("noteDate") || "" });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?aba=ficha`);
}

export async function optOutAction(fd: FormData) {
  const clientId = String(fd.get("clientId"));
  const actor = await requireActor();
  await setMarketingOptOut(actor, clientId, fd.get("optOut") === "1");
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}`);
}

export async function importAction(_p: ActionResult<unknown> | null, fd: FormData): Promise<ActionResult<unknown>> {
  let r: { created: number; updated: number; skipped: number; errors: string[] };
  try {
    const actor = await requireActor();
    const file = fd.get("file") as File | null;
    const pasted = String(fd.get("pasted") || "");
    const text = file && file.size > 0 ? await file.text() : pasted;
    if (!text.trim()) return { ok: false, code: "VALIDATION", message: "Envie um arquivo ou cole a lista." };
    const rows: ImportRow[] = parseCsv(text);
    if (!rows.length) return { ok: false, code: "VALIDATION", message: "Não encontrei nome e telefone nas linhas. Confira o formato." };
    r = await importClients(actor, rows);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/clientes");
  redirect(`/clientes/importar?ok=1&criadas=${r.created}&atualizadas=${r.updated}&puladas=${r.skipped}`);
}
