/**
 * Catálogo de ações. Nome = modulo.recurso.acao.
 * Papéis do sistema combinam ações; o backend sempre checa.
 */
export const ACTIONS = {
  // core
  "core.user.manage": "Gerenciar usuários e acessos",
  "core.settings.manage": "Configurar o salão (horários, agendamento online, automações)",
  // catálogo
  "catalog.service.manage": "Cadastrar e editar serviços e pacotes",
  "catalog.product.manage": "Cadastrar produtos e movimentar estoque",
  "catalog.product.read": "Ver produtos e estoque",
  // equipe
  "team.professional.manage": "Gerenciar profissionais e horários",
  // clientes
  "crm.client.read": "Ver clientes e histórico",
  "crm.client.write": "Cadastrar e editar clientes",
  "crm.client.import": "Importar base de clientes",
  "crm.client.export": "Exportar base de clientes",
  "crm.note.write": "Registrar ficha técnica e observações",
  // agenda
  "agenda.appointment.read": "Ver a agenda",
  "agenda.appointment.read_own": "Ver só a própria agenda",
  "agenda.appointment.write": "Marcar, remarcar e cancelar atendimentos",
  "agenda.block.write": "Bloquear horários",
  // comanda e caixa
  "pos.order.read": "Ver comandas",
  "pos.order.write": "Abrir comanda, lançar itens e receber",
  "pos.order.discount": "Dar desconto manual",
  "pos.order.cancel": "Cancelar comanda",
  "pos.cash.manage": "Abrir e fechar caixa, sangria e suprimento",
  "pos.cash.read": "Ver caixa",
  // comissões
  "commission.read_all": "Ver comissões de toda a equipe",
  "commission.read_own": "Ver só as próprias comissões",
  "commission.close": "Fechar período de comissões",
  // marketing
  "mkt.campaign.manage": "Criar e disparar campanhas",
  "mkt.voucher.manage": "Criar vouchers",
  "mkt.voucher.redeem": "Resgatar voucher na comanda",
  // relatórios
  "report.read": "Ver relatórios e painel financeiro",
} as const;

export type Action = keyof typeof ACTIONS;

export const SYSTEM_ROLES: Record<string, { name: string; permissions: Action[] | ["*"] }> = {
  OWNER: { name: "Dona(o)", permissions: ["*"] },
  MANAGER: {
    name: "Gerente",
    permissions: [
      "catalog.service.manage", "catalog.product.manage", "catalog.product.read", "team.professional.manage",
      "crm.client.read", "crm.client.write", "crm.client.import", "crm.note.write",
      "agenda.appointment.read", "agenda.appointment.write", "agenda.block.write",
      "pos.order.read", "pos.order.write", "pos.order.discount", "pos.order.cancel", "pos.cash.manage", "pos.cash.read",
      "commission.read_all", "commission.close", "mkt.campaign.manage", "mkt.voucher.manage", "mkt.voucher.redeem", "report.read",
    ],
  },
  RECEPTION: {
    name: "Recepção",
    permissions: [
      "catalog.product.read", "crm.client.read", "crm.client.write", "crm.note.write",
      "agenda.appointment.read", "agenda.appointment.write", "agenda.block.write",
      "pos.order.read", "pos.order.write", "pos.cash.manage", "pos.cash.read", "mkt.voucher.redeem",
    ],
  },
  PROFESSIONAL: {
    name: "Profissional",
    permissions: ["crm.client.read", "crm.note.write", "agenda.appointment.read_own", "agenda.appointment.write", "pos.order.read", "pos.order.write", "commission.read_own", "catalog.product.read"],
  },
  FINANCE: {
    name: "Financeiro",
    permissions: ["pos.order.read", "pos.cash.manage", "pos.cash.read", "commission.read_all", "commission.close", "report.read", "crm.client.read", "catalog.product.read"],
  },
};
