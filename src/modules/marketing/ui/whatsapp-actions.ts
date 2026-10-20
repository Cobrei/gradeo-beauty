"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/core/application/auth";
import { toActionError } from "@/lib/errors";
import { disconnectQr, setQrSending, startQr } from "../application/whatsapp-qr";

const back = (q = "") => redirect(`/configuracoes/whatsapp${q}`);

export async function startQrAction(fd: FormData) {
  let err: string | null = null;
  try {
    await startQr(await requireActor(), fd.get("terms") === "on");
  } catch (e) {
    const r = toActionError(e);
    err = r.ok ? null : r.message;
  }
  revalidatePath("/configuracoes/whatsapp");
  back(err ? `?erro=${encodeURIComponent(err)}` : "");
}

export async function setQrSendingAction(fd: FormData) {
  let err: string | null = null;
  try {
    await setQrSending(await requireActor(), fd.get("on") === "1");
  } catch (e) {
    const r = toActionError(e);
    err = r.ok ? null : r.message;
  }
  revalidatePath("/configuracoes/whatsapp");
  back(err ? `?erro=${encodeURIComponent(err)}` : "?salvo=1");
}

export async function disconnectQrAction() {
  await disconnectQr(await requireActor());
  revalidatePath("/configuracoes/whatsapp");
  back("?desconectado=1");
}
