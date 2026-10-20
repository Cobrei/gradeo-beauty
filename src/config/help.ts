// Central de ajuda: respostas curtas por tema, com link direto para a tela.
export type HelpItem = { q: string; a: string; href?: string; cta?: string };
export type HelpTopic = { title: string; items: HelpItem[] };

export const HELP: HelpTopic[] = [
  {
    title: "Primeiros passos",
    items: [
      { q: "Por onde eu começo?", a: "Siga o quadro “Por onde começar” no Início: 1) horário, logo e cor do salão; 2) serviços, preços e tempos; 3) equipe e o que cada um faz; 4) clientes; 5) primeiro agendamento; 6) abrir o caixa e fechar a primeira comanda.", href: "/painel", cta: "Ir para o Início" },
      { q: "Como cadastro um serviço que não veio pronto?", a: "Em Serviços, toque em + Serviço e informe nome, preço, duração e, se quiser, o ciclo de retorno em dias (usado para lembrar a cliente de voltar).", href: "/servicos", cta: "Abrir Serviços" },
      { q: "Como cadastro as profissionais?", a: "Em Equipe, toque em + Profissional. Informe nome, cor na agenda, % de comissão, os serviços que ela faz e, se for diferente do salão, o horário próprio. Para ela usar o sistema, preencha e-mail e senha em Acesso ao sistema.", href: "/equipe", cta: "Abrir Equipe" },
      { q: "Como trago minhas clientes de outro sistema ou do celular?", a: "Em Clientes → Importar: envie a planilha, a lista de contatos do celular ou cole o texto. Duplicadas são juntadas pelo telefone.", href: "/clientes/importar", cta: "Importar clientes" },
      { q: "Como mudo como o sistema me chama?", a: "Toque em “Olá, (seu nome)” no menu e preencha “Como você quer ser chamado(a)?”.", href: "/perfil", cta: "Meu perfil" },
    ],
  },
  {
    title: "Agenda",
    items: [
      { q: "Como marco um horário?", a: "Toque em + Agendar. Digite as primeiras letras do nome da cliente e escolha na lista. Marque todos os serviços que ela vai fazer, escolha quem atende cada um e o horário livre. Confira o resumo e confirme.", href: "/agenda/novo", cta: "Novo agendamento" },
      { q: "A cliente vai fazer corte, cor e unhas. Como marco tudo?", a: "No novo agendamento, marque os três serviços. Cada um ganha a escolha de profissional e horário; o sistema já sugere o horário logo depois do serviço anterior. Serviços com profissionais diferentes podem ficar no mesmo horário." },
      { q: "Não aparece horário livre. E agora?", a: "Troque o dia ou a profissional. Se precisar encaixar mesmo assim, digite a hora e marque “Encaixar mesmo se houver conflito de horário”." },
      { q: "Como bloqueio almoço, folga ou curso?", a: "Na Agenda, toque em Bloquear e escolha a profissional (ou o salão todo), o dia e o horário.", href: "/agenda", cta: "Abrir a Agenda" },
      { q: "Como a cliente marca sozinha pelo link?", a: "Seu link de agendamento aparece em Configurações (Endereço de agendamento). Coloque na bio do Instagram e no WhatsApp. Os pedidos entram na agenda em amarelo para você confirmar.", href: "/configuracoes", cta: "Ver meu link" },
    ],
  },
  {
    title: "Comanda, caixa e comissões",
    items: [
      { q: "Como recebo de uma cliente?", a: "No atendimento, toque em Finalizar: a comanda abre com os serviços. Inclua produtos, aplique desconto ou voucher e toque em Receber, escolhendo Pix, cartão ou dinheiro. Dá para mandar o recibo pelo WhatsApp." },
      { q: "Como abro e fecho o caixa?", a: "Em Caixa, abra com o fundo de troco. Lance sangrias e despesas durante o dia. No fim, informe o dinheiro contado e feche: o sistema mostra a diferença.", href: "/caixa", cta: "Abrir o Caixa" },
      { q: "Como funcionam as comissões?", a: "São calculadas item a item quando a comanda é paga, pelo % do serviço ou da profissional. Em Comissões, escolha o período, confira e feche; depois marque como paga.", href: "/comissoes", cta: "Abrir Comissões" },
      { q: "Trabalho com profissionais parceiros (MEI). O sistema ajuda?", a: "Sim. Ligue em Configurações → Recursos opcionais → Trabalho com profissionais parceiros. Aparece o CNPJ na Equipe e a aba Salão-parceiro em Comissões, com a planilha para o contador.", href: "/lei-salao-parceiro", cta: "Entenda a lei" },
    ],
  },
  {
    title: "Clientes e mensagens",
    items: [
      { q: "Como mando lembrete e confirmação para as clientes?", a: "As mensagens ficam prontas sozinhas todo dia na fila de envio (Mensagens). Um toque abre o WhatsApp com o texto pronto. Ajuste os textos em Configurações → Automações.", href: "/mensagens", cta: "Abrir a fila" },
      { q: "Como trago de volta quem sumiu?", a: "Em Clientes, veja o segmento Sumidas. Em Campanhas, crie uma campanha de retorno com voucher: o sistema mostra quem voltou e quanto entrou no caixa.", href: "/campanhas", cta: "Abrir Campanhas" },
      { q: "Como ligo a pesquisa de satisfação e a fidelidade?", a: "Em Configurações → Automações. As duas vêm desligadas; ligue só se quiser.", href: "/configuracoes/automacoes", cta: "Abrir Automações" },
      { q: "Uma cliente não quer mais receber mensagens.", a: "Na ficha dela, toque em “Não enviar mais mensagens”. O sistema respeita em todos os envios." },
    ],
  },
  {
    title: "Conta e acesso",
    items: [
      { q: "Esqueci a senha.", a: "A dona do salão define uma nova em Equipe → (profissional) → Acesso ao sistema. Se for a dona, fale com o suporte." },
      { q: "A profissional não vê uma tela.", a: "Cada perfil vê só o que precisa. A dona ajusta o perfil em Equipe → Acesso ao sistema." },
      { q: "Posso usar no celular?", a: "Sim. Abra no navegador e, no menu do navegador, toque em “Adicionar à tela inicial” para usar como aplicativo." },
    ],
  },
];
