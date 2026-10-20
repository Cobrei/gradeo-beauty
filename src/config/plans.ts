// Planos exibidos na home pública. Cobrança por faixa de profissionais, como o mercado (Trinks, Avec, AppBarber),
// mas com WhatsApp e campanhas inclusos — o que os líderes vendem como adicional.
export type Plan = { id: string; name: string; price: number; annual: number; who: string; highlight?: boolean; items: string[] };

export const PROMO_NOTE = "Sem taxa de adesão. No plano anual, cerca de 20% de desconto.";
export const TRIAL_DAYS = 30;

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    price: 59.9,
    annual: 47.9,
    who: "1 profissional",
    items: ["Agenda e link de agendamento online", "Ficha da cliente com histórico", "Comanda, caixa e estoque", "Lembretes e campanhas pelo WhatsApp", "Vouchers e aniversariantes"],
  },
  {
    id: "equipe",
    name: "Equipe",
    price: 119.9,
    annual: 94.9,
    who: "2 a 5 profissionais",
    highlight: true,
    items: ["Tudo do Solo", "Comissões automáticas por serviço e produto", "Perfis de acesso (recepção, profissional, financeiro)", "Campanhas com voucher medidas até o caixa", "Relatórios de retenção"],
  },
  {
    id: "salao",
    name: "Salão",
    price: 189.9,
    annual: 149.9,
    who: "6 a 15 profissionais",
    items: ["Tudo do Equipe", "Pacotes e créditos de sessão", "Envio automático de WhatsApp (API oficial)", "Importação assistida da sua base", "Suporte prioritário"],
  },
];

export const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
