import Link from "next/link";
import { Card, Notice, PageHeader } from "@/components/ui";
import { QR_TERMS } from "@/config/terms-whatsapp";
import { requireActor } from "@/modules/core/application/auth";
import { qrStatus } from "@/modules/marketing/application/whatsapp-qr";
import { disconnectQrAction, setQrSendingAction, startQrAction } from "@/modules/marketing/ui/whatsapp-actions";
import { formatPhone } from "@/lib/phone";
import { AutoRefresh } from "./auto-refresh";

export const metadata = { title: "WhatsApp do salão" };
export const dynamic = "force-dynamic";

export default async function WhatsappPage({ searchParams }: { searchParams: Promise<{ erro?: string; salvo?: string; desconectado?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const st = await qrStatus(actor);
  const connected = st.state === "open";
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="WhatsApp do salão" subtitle="Conecte o número do salão para os lembretes, confirmações e recibos saírem sozinhos." action={<Link href="/configuracoes" className="btn btn-secondary btn-sm">← Configurações</Link>} />
      {sp.erro && <div className="mb-4"><Notice tone="bad">{sp.erro}</Notice></div>}
      {sp.salvo && <div className="mb-4"><Notice tone="ok">Salvo.</Notice></div>}
      {sp.desconectado && <div className="mb-4"><Notice tone="mist">WhatsApp desconectado. As mensagens voltam para o modo manual (um toque por mensagem).</Notice></div>}

      {!st.configured ? (
        <Card>
          <h2 className="font-bold">Em ativação</h2>
          <p className="mt-1 text-sm text-ink-2">O envio automático pelo WhatsApp do salão está sendo ligado. Enquanto isso, a fila de mensagens funciona no modo manual: um toque abre o WhatsApp com o texto pronto.</p>
        </Card>
      ) : connected ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ok">Conectado</div>
              <div className="text-lg font-bold">{st.phone ? formatPhone(st.phone) : "Número do salão"}</div>
              <p className="text-sm text-muted">As mensagens saem por este número, aos poucos, e aparecem no WhatsApp do salão.</p>
            </div>
            <form action={disconnectQrAction}><button className="btn btn-secondary btn-sm">Desconectar</button></form>
          </div>
          <div className="mt-4 rounded-xl bg-mist p-4">
            <div className="font-semibold">Envio automático</div>
            <p className="text-sm text-ink-2">{st.provider === "WA_QR" ? "Ligado: lembretes, confirmações e mensagens da fila saem sozinhos." : "Desligado: a fila continua no modo manual (um toque por mensagem)."}</p>
            <form action={setQrSendingAction} className="mt-3">
              <input type="hidden" name="on" value={st.provider === "WA_QR" ? "0" : "1"} />
              <button className={`btn btn-sm ${st.provider === "WA_QR" ? "btn-secondary" : "btn-primary"}`}>{st.provider === "WA_QR" ? "Desligar envio automático" : "Ligar envio automático"}</button>
            </form>
          </div>
        </Card>
      ) : st.instance && st.termsAccepted ? (
        <Card>
          <AutoRefresh seconds={8} />
          <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border border-line bg-white p-2">
              {st.qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={st.qr} alt="QR code para conectar o WhatsApp" className="h-full w-full object-contain" />
              ) : (
                <span className="text-center text-sm text-muted">Gerando o QR code…</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">Escaneie com o celular do salão</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
                <li>Abra o WhatsApp (ou WhatsApp Business) no celular do salão.</li>
                <li>Toque em <b>⋮ / Configurações → Aparelhos conectados → Conectar um aparelho</b>.</li>
                <li>Aponte a câmera para o QR code ao lado.</li>
              </ol>
              <p className="mt-3 text-xs text-muted">O QR code muda a cada poucos segundos; esta página se atualiza sozinha. Depois de conectar, o celular não precisa ficar aberto.</p>
              <form action={disconnectQrAction} className="mt-3"><button className="text-sm text-muted underline">Cancelar</button></form>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg font-bold">Antes de conectar</h2>
          <p className="mt-1 text-sm text-ink-2">A conexão por QR code é rápida e não tem custo por mensagem, mas <b>não é o canal oficial do WhatsApp</b>. Leia o termo:</p>
          <div className="mt-3 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-line bg-mist p-4 text-sm">
            {QR_TERMS.map((t) => (
              <section key={t.title}><b>{t.title}</b><p className="mt-0.5 text-ink-2">{t.text}</p></section>
            ))}
          </div>
          <form action={startQrAction} className="mt-4 space-y-3">
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-[#b8475f]" /> Li e aceito o termo. Entendo que o WhatsApp pode restringir ou bloquear o número e que esse risco é do salão.</label>
            <button className="btn btn-primary">Aceitar e gerar o QR code</button>
          </form>
          <p className="mt-3 text-xs text-muted">Termo completo: <Link href="/termos/whatsapp" className="underline">/termos/whatsapp</Link>. Quer zero risco para o número? Fale com a gente sobre o WhatsApp oficial (Meta).</p>
        </Card>
      )}
    </div>
  );
}
