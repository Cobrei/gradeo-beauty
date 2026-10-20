import Link from "next/link";
import { can, type Actor } from "@/lib/context";

/**
 * Atalhos grandes dos módulos — a "porta de entrada" visual do painel (e da tela Mais no celular).
 * Cada módulo tem uma cor fixa: quem usa todo dia passa a achar pela cor antes de ler.
 * Só aparece o que o acesso da pessoa alcança.
 */
type Mod = { href: string; label: string; hint: string; color: string; icon: string; action?: string; anyOf?: string[] };

export const MODULES: Mod[] = [
  { href: "/agenda", label: "Agenda", hint: "Dia por profissional e pedidos online", color: "#b8475f", icon: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4", anyOf: ["agenda.appointment.read", "agenda.appointment.read_own"] },
  { href: "/clientes", label: "Clientes", hint: "Ficha, histórico e segmentos", color: "#8a5cc2", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0z", action: "crm.client.read" },
  { href: "/comandas", label: "Comandas", hint: "Serviços, produtos e pagamento", color: "#e08a2e", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6", action: "pos.order.read" },
  { href: "/caixa", label: "Caixa", hint: "Abertura, sangria e fechamento", color: "#2f9a78", icon: "M3 7h18v12H3zM3 11h18M7 15h3", action: "pos.cash.read" },
  { href: "/campanhas", label: "Campanhas", hint: "Traga as clientes de volta", color: "#e2577a", icon: "M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 9a3 3 0 010 6M18 6a7 7 0 010 12", action: "mkt.campaign.manage" },
  { href: "/vouchers", label: "Vouchers", hint: "Cupons pessoais e genéricos", color: "#d4a24c", icon: "M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4zM10 6v12", action: "mkt.voucher.manage" },
  { href: "/mensagens", label: "Mensagens", hint: "Fila de envio pelo WhatsApp", color: "#25a26b", icon: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5", anyOf: ["mkt.message.send", "mkt.campaign.manage"] },
  { href: "/comissoes", label: "Comissões", hint: "Por profissional e período", color: "#3f7fbf", icon: "M12 3v18M16 7H9.5a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H7", anyOf: ["commission.read_all", "commission.read_own"] },
  { href: "/relatorios", label: "Relatórios", hint: "Faturamento, ticket e retenção", color: "#5b6fb5", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2", action: "report.read" },
  { href: "/servicos", label: "Serviços", hint: "Preço, tempo e ciclo de retorno", color: "#c25b8a", icon: "M6 6a3 3 0 106 0 3 3 0 00-6 0zM6 18a3 3 0 106 0 3 3 0 00-6 0zM11 8l9 10M11 16l9-10", action: "catalog.service.manage" },
  { href: "/produtos", label: "Estoque", hint: "Produtos, venda e consumo", color: "#a06a3f", icon: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10", action: "catalog.product.read" },
  { href: "/pacotes", label: "Pacotes", hint: "Combos e créditos de sessão", color: "#d46a5a", icon: "M4 8h16v12H4zM2 8h20V5H2zM12 5v15M12 5c-2-3-6-3-6 0M12 5c2-3 6-3 6 0", action: "catalog.service.manage" },
  { href: "/equipe", label: "Equipe", hint: "Profissionais e acessos", color: "#2a6f7f", icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M22 21v-2a4 4 0 00-3-3.87", action: "team.professional.manage" },
  { href: "/ajuda", label: "Ajuda", hint: "Dúvidas, manual e suporte", color: "#6b5b95", icon: "M12 22a10 10 0 100-20 10 10 0 000 20zM9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4.5M12 17.5h.01" },
  { href: "/configuracoes", label: "Ajustes", hint: "Salão, horários e automações", color: "#4b3d52", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z", action: "core.settings.manage" },
];

export function visibleModules(actor: Actor) {
  return MODULES.filter((m) => (!m.action || can(actor, m.action)) && (!m.anyOf || m.anyOf.some((a) => can(actor, a))));
}

export function ModuleGrid({ actor, withHints = false }: { actor: Actor; withHints?: boolean }) {
  const itens = visibleModules(actor);
  return (
    <nav aria-label="Módulos" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {itens.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className="group flex flex-col items-center gap-2 rounded-[var(--radius-card)] bg-white px-2 py-4 text-center shadow-[0_1px_2px_rgba(35,26,41,.05),0_4px_16px_rgba(35,26,41,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(35,26,41,.08),0_10px_24px_rgba(35,26,41,.10)] active:scale-[0.98]"
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.12)] transition group-hover:scale-105"
            style={{ background: m.color }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={m.icon} />
            </svg>
          </span>
          <span className="text-sm font-bold leading-tight">{m.label}</span>
          {withHints && <span className="hidden text-xs leading-snug text-muted sm:block">{m.hint}</span>}
        </Link>
      ))}
    </nav>
  );
}
