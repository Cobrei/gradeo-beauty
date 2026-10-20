import { PoweredBy } from "@/components/ui/salon-brand";
import { QR_TERMS } from "@/config/terms-whatsapp";
import { QR_TERMS_VERSION } from "@/modules/marketing/application/whatsapp-qr";

export const metadata = { title: "Termo de uso: WhatsApp por QR code" };

export default function TermoWhatsapp() {
  return (
    <main className="min-h-dvh bg-mist">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Termo de uso: envio de mensagens pelo WhatsApp por QR code</h1>
        <p className="mt-1 text-sm text-muted">Versão {QR_TERMS_VERSION}</p>
        <div className="card mt-6 space-y-4">
          {QR_TERMS.map((t) => (
            <section key={t.title}>
              <h2 className="font-bold">{t.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.text}</p>
            </section>
          ))}
        </div>
        <div className="mt-8 text-center"><PoweredBy /></div>
      </div>
    </main>
  );
}
