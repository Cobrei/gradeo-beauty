import { PageHeader } from "@/components/ui";
import { BRAND } from "@/config/brand";
import { HELP } from "@/config/help";
import { requireActor } from "@/modules/core/application/auth";
import { HelpSearch } from "./help-search";

export const metadata = { title: "Ajuda" };

export default async function AjudaPage() {
  await requireActor();
  const wa = `https://wa.me/${BRAND.supportWhatsApp}?text=${encodeURIComponent("Olá! Preciso de ajuda com o gradeo beauty.")}`;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ajuda" subtitle="Respostas rápidas, o manual completo e o suporte pelo WhatsApp." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <a href="/manual-gradeo-beauty.pdf" target="_blank" rel="noopener" className="card flex items-center gap-3 hover:ring-2 hover:ring-brand/30">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xl">📘</span>
          <span><b>Manual completo (PDF)</b><br /><span className="text-sm text-muted">Todas as telas, com prints e passo a passo</span></span>
        </a>
        <a href={wa} target="_blank" rel="noopener" className="card flex items-center gap-3 hover:ring-2 hover:ring-[#25d366]/40">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25d366]/15 text-xl">💬</span>
          <span><b>Falar com o suporte</b><br /><span className="text-sm text-muted">WhatsApp (51) 99373-5007</span></span>
        </a>
      </div>
      <HelpSearch topics={HELP} />
    </div>
  );
}
