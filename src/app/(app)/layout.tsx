import Link from "next/link";
import { brandStyle } from "@/lib/brand-style";
import { BackBar } from "@/components/ui/back-bar";
import { redirect } from "next/navigation";
import { PoweredBy, SalonMark } from "@/components/ui/salon-brand";
import { getSettings } from "@/modules/core/application/settings";
import { getActor } from "@/modules/core/application/auth";
import { logoutAction } from "@/modules/core/ui/actions";
import { can } from "@/lib/context";

const NAV: { href: string; label: string; icon: string; action?: string; anyOf?: string[]; mobile?: boolean }[] = [
  { href: "/painel", label: "Início", icon: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z", mobile: true },
  { href: "/agenda", label: "Agenda", icon: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4", anyOf: ["agenda.appointment.read", "agenda.appointment.read_own"], mobile: true },
  { href: "/clientes", label: "Clientes", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0z", action: "crm.client.read", mobile: true },
  { href: "/comandas", label: "Comandas", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6", action: "pos.order.read", mobile: true },
  { href: "/campanhas", label: "Campanhas", icon: "M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 9a3 3 0 010 6M18 6a7 7 0 010 12", action: "mkt.campaign.manage" },
  { href: "/caixa", label: "Caixa", icon: "M3 7h18v12H3zM3 11h18M7 15h3", action: "pos.cash.read" },
  { href: "/comissoes", label: "Comissões", icon: "M12 3v18M16 7H9.5a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H7", anyOf: ["commission.read_all", "commission.read_own"] },
  { href: "/relatorios", label: "Relatórios", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2", action: "report.read" },
  { href: "/servicos", label: "Serviços", icon: "M4 7h16M4 12h16M4 17h10", action: "catalog.service.manage" },
  { href: "/produtos", label: "Produtos", icon: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10", action: "catalog.product.read" },
  { href: "/equipe", label: "Equipe", icon: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0", action: "team.professional.manage" },
  { href: "/configuracoes", label: "Configurações", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 00-1.7-1L14.5 3h-5l-.4 2.5a7 7 0 00-1.7 1l-2.3-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.3-1a7 7 0 001.7 1l.4 2.5h5l.4-2.5a7 7 0 001.7-1l2.3 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z", action: "core.settings.manage" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const nav = NAV.filter((n) => (!n.action || can(actor, n.action)) && (!n.anyOf || n.anyOf.some((a) => can(actor, a))));
  const salon = await getSettings(actor);
  const mobile = [...nav.filter((n) => n.mobile), { href: "/mais", label: "Mais", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" }];
  return (
    <div className="flex min-h-dvh" style={brandStyle(salon.brandColor)}>
      <aside className="hidden w-60 shrink-0 flex-col bg-ink px-3 py-5 text-white md:flex">
        <Link href="/painel" className="mb-5 block rounded-2xl bg-white px-3 py-3 text-ink">
          {salon.logoData ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={salon.logoData} alt={salon.salonName} className="mx-auto max-h-14 max-w-full object-contain" />
            </>
          ) : (
            <>
              <SalonMark name={salon.salonName} logo={null} color={salon.brandColor} size={34} />
            </>
          )}
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/10">
              <Icon d={n.icon} />
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/ajuda" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/10">
          <Icon d="M12 22a10 10 0 100-20 10 10 0 000 20zM9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4.5M12 17.5h.01" />
          Ajuda
        </Link>
        <Link href="/perfil" className="mb-1 block truncate rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10" title="Como você quer ser chamado(a)">Olá, <b className="text-white">{actor.nickname}</b></Link>
        <form action={logoutAction}>
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10">Sair</button>
        </form>
        <div className="mt-3 px-3"><PoweredBy tone="dark" label="sistema" /></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-4 py-3 md:hidden">
          <Link href="/painel" className="min-w-0">
            <SalonMark name={salon.salonName} logo={salon.logoData} color={salon.brandColor} size={30} showName={!salon.logoData} />
          </Link>
          <details className="relative">
            <summary className="list-none rounded-lg px-2 py-1 text-sm font-semibold text-ink-2">Menu</summary>
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-line bg-white p-2 shadow-lg">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-mist">
                  {n.label}
                </Link>
              ))}
              <Link href="/ajuda" className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-mist">Ajuda</Link>
              <Link href="/perfil" className="block rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-mist">Olá, <b>{actor.nickname}</b> · perfil</Link>
              <form action={logoutAction}>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-mist">Sair</button>
              </form>
            </div>
          </details>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-2 md:px-8 md:pb-8 md:pt-6"><BackBar />{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-10 grid border-t border-line bg-white md:hidden" style={{ gridTemplateColumns: `repeat(${mobile.length}, 1fr)`, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {mobile.map((n) => (
            <Link key={n.href} href={n.href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-ink-2">
              <Icon d={n.icon} />
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
