// Planos exibidos na home pública. Preço em reais por mês, por salão (não por profissional).
export type Plan = { id: string; name: string; price: number; promo?: number; who: string; highlight?: boolean; items: string[] };

export const PROMO_NOTE = "Preço de lançamento nos 6 primeiros meses. Sem fidelidade, sem taxa de adesão.";

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    price: 59,
    promo: 39,
    who: "Para quem atende sozinha",
    items: ["1 profissional", "Agenda e link de agendamento online", "Ficha da cliente com histórico", "Comanda, caixa e estoque", "Lembretes pelo WhatsApp"],
  },
  {
    id: "salao",
    name: "Salão",
    price: 129,
    promo: 89,
    who: "Para salões e barbearias com equipe",
    highlight: true,
    items: ["Até 6 profissionais", "Tudo do Solo", "Comissões automáticas", "Campanhas e vouchers para a base", "Relatórios de retenção"],
  },
  {
    id: "studio",
    name: "Studio",
    price: 219,
    promo: 159,
    who: "Para operações maiores",
    items: ["Profissionais ilimitados", "Tudo do Salão", "Envio automático de WhatsApp", "Pacotes e créditos de sessão", "Suporte prioritário"],
  },
];
