// Planos da home pública. Preço baixo de entrada (sem barreira); o PRO destrava equipe e retenção,
// o MEGA destrava escala. "em breve" só para o que está no roteiro dos próximos 60–90 dias.
export type PlanId = "basic" | "pro" | "mega";
export type Plan = { id: PlanId; name: string; price: number; who: string; highlight?: boolean; items: string[] };
export type Cell = boolean | string;
export type FeatureRow = { label: string; basic: Cell; pro: Cell; mega: Cell; group?: string };

export const TRIAL_DAYS = 30;
export const PROMO_NOTE = `${TRIAL_DAYS} dias grátis, sem cartão e sem fidelidade. No plano anual, 2 meses de presente.`;

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 29.9,
    who: "Para quem atende sozinha ou em dupla",
    items: ["Até 2 profissionais", "Agenda e agendamento online pelo seu link", "Comanda, caixa e estoque", "Ficha da cliente e ficha técnica", "WhatsApp em um toque (sem custo de mensagem)"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49.9,
    who: "Para salões e barbearias com equipe",
    highlight: true,
    items: ["Até 5 profissionais", "Tudo do Basic", "Comissões automáticas", "Campanhas com voucher medidas até o caixa", "Todos os segmentos de clientes e perfis de acesso"],
  },
  {
    id: "mega",
    name: "Mega",
    price: 79.9,
    who: "Para operações maiores",
    items: ["Até 12 profissionais", "Tudo do Pro", "Coortes de retenção", "Migração assistida da sua base", "Suporte prioritário"],
  },
];

export const FEATURES: FeatureRow[] = [
  { group: "Limites", label: "Profissionais com agenda", basic: "até 2", pro: "até 5", mega: "até 12" },
  { label: "Acessos (logins da equipe)", basic: "2", pro: "6", mega: "Ilimitados" },
  { label: "Clientes cadastradas", basic: "até 1.000", pro: "Ilimitadas", mega: "Ilimitadas" },

  { group: "Agenda", label: "Agenda do dia por profissional", basic: true, pro: true, mega: true },
  { label: "Encaixe, bloqueios, remarcação e lista de espera", basic: true, pro: true, mega: true },
  { label: "Agendamento online pelo link do salão", basic: true, pro: true, mega: true },
  { label: "Visão semanal da agenda", basic: "em breve", pro: "em breve", mega: "em breve" },
  { label: "Sinal por Pix no agendamento online", basic: false, pro: "em breve", mega: "em breve" },

  { group: "Comanda e caixa", label: "Comanda com serviços, produtos e vários meios de pagamento", basic: true, pro: true, mega: true },
  { label: "Recibo pelo WhatsApp", basic: true, pro: true, mega: true },
  { label: "Caixa: abertura, sangria, suprimento e fechamento", basic: true, pro: true, mega: true },
  { label: "Estoque com baixa automática na venda", basic: true, pro: true, mega: true },
  { label: "Pacotes com créditos de sessão", basic: true, pro: true, mega: true },
  { label: "Comissões por serviço e produto, com fechamento", basic: false, pro: true, mega: true },

  { group: "Clientes", label: "Ficha com histórico, ritmo e previsão de retorno", basic: true, pro: true, mega: true },
  { label: "Ficha técnica: fórmula, alergia, preferência", basic: true, pro: true, mega: true },
  { label: "Importar clientes (planilha ou contatos do celular)", basic: true, pro: true, mega: true },
  { label: "Segmentos automáticos", basic: "Aniversariantes e novas", pro: "Todos", mega: "Todos" },

  { group: "Marketing e WhatsApp", label: "Mensagens em um toque pelo seu WhatsApp", basic: true, pro: true, mega: true },
  { label: "Lembrete de horário e aniversário (fila pronta)", basic: true, pro: true, mega: true },
  { label: "Agradecimento, convite de retorno e resgate de sumidas", basic: false, pro: true, mega: true },
  { label: "Campanhas prontas", basic: "2 modelos", pro: "8 modelos", mega: "8 modelos" },
  { label: "Voucher pessoal de uso único", basic: false, pro: true, mega: true },
  { label: "Medição de quem voltou e da receita da campanha", basic: false, pro: true, mega: true },
  { label: "Lembrete automático pelo WhatsApp oficial do salão", basic: false, pro: "em breve", mega: "em breve" },

  { group: "Gestão", label: "Relatório de faturamento, ticket e meios de pagamento", basic: true, pro: true, mega: true },
  { label: "Relatórios por profissional e serviço, novas × recorrentes, faltas", basic: false, pro: true, mega: true },
  { label: "Coortes de retenção", basic: false, pro: false, mega: true },
  { label: "Perfis de acesso", basic: "Dona e recepção", pro: "Todos", mega: "Todos" },
  { label: "Funciona no celular (instala pelo navegador)", basic: true, pro: true, mega: true },
  { label: "Suporte", basic: "WhatsApp", pro: "WhatsApp", mega: "Prioritário + migração" },
];

export const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
