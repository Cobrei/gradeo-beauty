// Central de ajuda: respostas por módulo do sistema, cada uma com atalho para a tela certa.
export type HelpItem = { q: string; a: string; href?: string; cta?: string };
export type HelpTopic = { title: string; items: HelpItem[] };

export const HELP: HelpTopic[] = [
  {
    title: "Primeiros passos",
    items: [
      { q: "Por onde eu começo?", a: "Siga o quadro “Por onde começar” no Início, nesta ordem: 1) horário, logo e cor do salão; 2) serviços, preços e tempos; 3) equipe e o que cada um faz; 4) clientes; 5) primeiro agendamento; 6) abrir o caixa e fechar a primeira comanda. Cada passo é riscado quando você conclui, e o quadro some quando tudo estiver pronto.", href: "/painel", cta: "Ir para o Início" },
      { q: "Por que a ordem importa?", a: "A agenda só mostra horários livres quando o horário do salão, os serviços (com duração) e a equipe (com os serviços que cada um faz) estão cadastrados. E as comissões só saem certas com o percentual de cada profissional preenchido." },
      { q: "Quanto tempo leva para deixar o salão pronto?", a: "Cerca de 30 minutos. Os serviços já vêm com preço, tempo e ciclo de retorno sugeridos conforme o tipo de negócio escolhido no cadastro; você só ajusta." },
      { q: "Como funciona o teste grátis?", a: "São 30 dias com todos os recursos do plano Pro, sem cartão e sem fidelidade. No fim do teste, você escolhe o plano que combina com o seu salão." },
      { q: "Posso usar no celular?", a: "Sim. Abra o sistema no navegador do celular e, no menu do navegador, toque em “Adicionar à tela inicial”. Ele passa a abrir como um aplicativo. No celular, a barra de baixo traz Início, Agenda, Clientes, Comandas e Mais." },
    ],
  },
  {
    title: "Início (painel)",
    items: [
      { q: "O que aparece no Início?", a: "Os atalhos de cada módulo, o faturado do dia e do mês, os atendimentos do dia, as clientes sumidas com o valor estimado de trazê-las de volta, as mensagens pendentes, os próximos atendimentos, os aniversários da semana e os produtos com estoque baixo.", href: "/painel", cta: "Abrir o Início" },
      { q: "Por que não vejo o faturamento no Início?", a: "Os valores em dinheiro aparecem só para os perfis com acesso a relatórios (dona, gerente e financeiro). Recepção e profissionais veem os atendimentos." },
      { q: "O que é o aviso “Avaliações para olhar”?", a: "Aparece quando a pesquisa de satisfação está ligada e uma cliente dá nota de 1 a 3. Mostra o comentário, um botão para falar com ela pelo WhatsApp e o botão Resolvido para tirar o aviso." },
    ],
  },
  {
    title: "Recepcionista com IA",
    items: [
      { q: "O que a recepcionista faz?", a: "Ela conversa com suas clientes pelo chat do seu link de agendamento (e pelo WhatsApp, quando o envio automático estiver conectado). Responde preços, duração, horário de funcionamento, endereço e as regras que você escrever, mostra os horários livres de verdade e cria pedidos de horário.", href: "/recepcionista", cta: "Abrir a Recepcionista" },
      { q: "Ela confirma horários sozinha?", a: "Não. Ela cria um PEDIDO, igual ao agendamento online, que aparece na Agenda para você confirmar. Ela sempre avisa a cliente que o salão confirma pelo WhatsApp." },
      { q: "E quando ela não sabe responder?", a: "Remarcação, cancelamento, reclamação, dúvidas de saúde ou pedido de desconto vão para a equipe: a conversa ganha o aviso “equipe”, aparece no Início e você chama a cliente no WhatsApp com um toque. Depois, toque em Resolvido." },
      { q: "Como ensino as regras do meu salão?", a: "Em Recepcionista → Configurar, no campo “O que ela precisa saber do salão”, escreva estacionamento, formas de pagamento, tolerância de atraso, cuidados antes de procedimentos etc. Preços, serviços e horários ela já pega do sistema." },
      { q: "Posso testar antes de ligar?", a: "Sim. Use “Testar a conversa” na tela da Recepcionista e fale como se fosse uma cliente. Pedidos feitos no teste entram na Agenda; recuse depois se quiser." },
    ],
  },
  {
    title: "Agenda",
    items: [
      { q: "Como marco um horário?", a: "Toque em + Agendar. 1) Digite as primeiras letras do nome ou do telefone da cliente e escolha na lista. 2) Marque os serviços que ela vai fazer. 3) Para cada serviço, escolha quem atende e um horário livre. 4) Confira o resumo e toque em Confirmar.", href: "/agenda/novo", cta: "Novo agendamento" },
      { q: "A cliente vai fazer corte, cor e unhas. Como marco tudo de uma vez?", a: "Marque os três serviços no novo agendamento. Cada um ganha a escolha de profissional e horário. O sistema já sugere o horário logo depois do serviço anterior (borda dourada). Serviços com profissionais diferentes podem ficar no mesmo horário. Na hora de receber, tudo cai na mesma comanda." },
      { q: "A cliente é nova, ainda não tem cadastro.", a: "Siga o agendamento normalmente. No último passo, preencha o nome e o WhatsApp: o cadastro dela é criado na hora." },
      { q: "Não aparece horário livre. E agora?", a: "Troque o dia ou a profissional. Se precisar encaixar mesmo assim, digite a hora no campo Hora do serviço e marque “Encaixar mesmo se houver conflito de horário”." },
      { q: "Como vejo a semana inteira?", a: "Na Agenda, toque em Semana. Aparecem os sete dias com o total de atendimentos e o valor previsto. Os botões com o nome de cada profissional filtram. Toque no dia para abrir a agenda daquele dia, ou num horário vazio para agendar ali.", href: "/agenda?v=semana", cta: "Ver a semana" },
      { q: "Como remarco ou cancelo?", a: "Toque no atendimento na agenda. Em Remarcar, escolha nova data, hora e profissional. Para cancelar ou marcar falta, use os botões de situação do atendimento." },
      { q: "O que significam as situações do atendimento?", a: "Pedido online (a cliente pediu pelo link e você precisa confirmar), Marcado, Confirmado (a cliente confirmou presença), Em atendimento, Finalizado (comanda aberta ou paga), Faltou e Cancelado. Faltou e Cancelado podem voltar para Marcado." },
      { q: "Como peço para a cliente confirmar presença?", a: "O lembrete automático já leva o link de confirmação. Se quiser pedir na hora, abra o atendimento e toque em “Pedir confirmação no WhatsApp”. Quando ela confirma pelo link, a situação muda para Confirmado sozinha." },
      { q: "Como bloqueio almoço, folga ou curso?", a: "Na Agenda, toque em Bloquear. Escolha a profissional ou o salão inteiro, a data, o horário (das… até…) e o motivo. O horário bloqueado some do agendamento online.", href: "/agenda/bloqueio", cta: "Bloquear horário" },
      { q: "Como funciona a lista de espera?", a: "Em Agenda → Lista de espera, coloque a cliente, o serviço, a profissional (ou qualquer), o período e até quando ela pode esperar. Quando um horário vaga (cancelamento ou falta), o atendimento mostra quem da lista encaixa.", href: "/agenda/espera", cta: "Lista de espera" },
    ],
  },
  {
    title: "Agendamento online (link do salão)",
    items: [
      { q: "Onde está o meu link de agendamento?", a: "Em Configurações, no campo Endereço de agendamento. Coloque o link na bio do Instagram, no status e na mensagem de ausência do WhatsApp.", href: "/configuracoes", cta: "Ver meu link" },
      { q: "Como a cliente marca pelo link?", a: "Ela escolhe o serviço, a profissional e um horário livre, informa nome e WhatsApp e envia. O pedido entra na agenda em amarelo, como Pedido online, para você confirmar." },
      { q: "Como desligo o agendamento online ou tiro um serviço dele?", a: "Para desligar tudo: Configurações → Agendamento online. Para tirar um serviço: em Serviços, desmarque “aparece no agendamento online”. Para tirar uma profissional: em Equipe, desmarque “Aparece no agendamento online”." },
      { q: "Como evito pedidos em cima da hora?", a: "Em Configurações → Agendamento online, ajuste a Antecedência mínima (em minutos). Ali também fica a grade de horários (de 15 em 15 minutos, por exemplo)." },
    ],
  },
  {
    title: "Clientes",
    items: [
      { q: "Como cadastro uma cliente?", a: "Em Clientes, toque em + Cliente e preencha nome, WhatsApp e, se quiser, e-mail e data de nascimento (usada nas mensagens de aniversário). Ou cadastre na hora do agendamento.", href: "/clientes/nova", cta: "Nova cliente" },
      { q: "Como importo minhas clientes?", a: "Em Clientes → Importar: envie uma planilha (CSV), os contatos exportados do celular (VCF) ou cole a lista. Telefones repetidos são ignorados, então pode importar sem medo de duplicar.", href: "/clientes/importar", cta: "Importar clientes" },
      { q: "O que tem na ficha da cliente?", a: "Visitas, total gasto, ticket médio, última visita, ritmo (de quantos em quantos dias ela vem) com a previsão da próxima visita, todos os atendimentos, os próximos horários, créditos de pacote, vouchers e as mensagens enviadas." },
      { q: "Como anoto a fórmula da cor ou uma alergia?", a: "Na ficha da cliente, em Registrar, escolha o tipo (fórmula, alergia, preferência ou observação), o serviço e a profissional, e salve. A última fórmula fica em destaque e as alergias aparecem em vermelho." },
      { q: "O que são os segmentos (Sumidas, VIP…)?", a: "Grupos que o sistema atualiza sozinho: Sumidas (mais de 45 dias sem vir), Atrasadas no ciclo, Aniversariantes do mês, VIP, Vieram só uma vez e Novas (30 dias). Servem de público para as campanhas.", href: "/clientes", cta: "Ver clientes" },
      { q: "Como dou um desconto pessoal para uma cliente?", a: "Na ficha dela, em Dar um voucher, escolha % ou R$, o valor e até quando vale, e toque em Criar e enviar. O código aparece na tela e a mensagem pronta abre no WhatsApp." },
      { q: "Uma cliente não quer mais receber mensagens.", a: "Na ficha dela, toque em “Não enviar mais mensagens (opt-out)”. Ela sai de todas as campanhas e automações de marketing." },
    ],
  },
  {
    title: "Comandas",
    items: [
      { q: "Como abro uma comanda?", a: "O jeito mais rápido é pela agenda: no atendimento, toque em “Finalizar e abrir comanda” e os serviços já entram. Para venda avulsa, use + Comanda e escolha a cliente.", href: "/comandas/nova", cta: "Nova comanda" },
      { q: "Como incluo produto, serviço ou pacote?", a: "Dentro da comanda: Adicionar serviço (com a profissional), Produto (com quem vendeu e a quantidade; o estoque baixa sozinho) ou Pacote." },
      { q: "Como dou desconto ou uso um voucher?", a: "Em Desconto manual, informe o valor e o motivo. Para voucher, digite o código e toque em Aplicar; o sistema confere validade, pedido mínimo e limite de usos." },
      { q: "Como recebo com mais de um meio de pagamento?", a: "Em Pagamentos, preencha quanto vai em cada meio (Pix, dinheiro, débito, crédito com parcelas). A soma precisa dar o total da comanda." },
      { q: "Como envio o recibo?", a: "Depois de receber, toque em Enviar recibo pelo WhatsApp. A cliente recebe um link com o recibo na marca do salão." },
      { q: "Errei a comanda. E agora?", a: "Enquanto estiver aberta, dá para remover itens. Para desfazer tudo, use Cancelar comanda e informe o motivo. Comanda já paga fica travada para não bagunçar o caixa e as comissões." },
      { q: "Por que não consigo receber em dinheiro?", a: "Pagamento em dinheiro exige caixa aberto. Abra o caixa (ou peça para a gerência abrir) e volte à comanda." },
    ],
  },
  {
    title: "Caixa",
    items: [
      { q: "Como abro o caixa?", a: "Em Caixa, informe o fundo de troco (o dinheiro que já está na gaveta) e toque em Abrir caixa.", href: "/caixa", cta: "Abrir o Caixa" },
      { q: "Como lanço sangria, despesa ou suprimento?", a: "Com o caixa aberto, em Movimentos: Saída (sangria ou despesa, como água e motoboy) ou Entrada (suprimento), com valor e descrição." },
      { q: "Como fecho o caixa?", a: "Conte o dinheiro da gaveta, informe em Dinheiro contado e toque em Fechar caixa. O sistema compara com o esperado (fundo + dinheiro recebido ± movimentos) e mostra a diferença." },
      { q: "Onde vejo os fechamentos antigos?", a: "Em Caixa, na lista Fechamentos anteriores: abertura, fechamento, faturado, esperado, contado e diferença de cada dia." },
    ],
  },
  {
    title: "Comissões",
    items: [
      { q: "Como a comissão é calculada?", a: "Item a item, quando a comanda é paga. Serviço: usa o % do serviço; se o serviço não tiver, usa o % da profissional. Produto: usa o % de produto da profissional. Pacote: cada sessão usada comissiona o preço cheio do serviço.", href: "/comissoes", cta: "Abrir Comissões" },
      { q: "Como fecho e pago as comissões?", a: "Escolha o período (ex.: 1 a 15), confira o detalhe de cada profissional e toque em Fechar. Quando pagar, vá em Fechamentos e marque como pago. Um período fechado não pode ser fechado de novo nem sobreposto." },
      { q: "A profissional pode ver a comissão dela?", a: "Sim, e só a dela. Quem tem perfil Profissional vê as próprias comissões; dona, gerente e financeiro veem todas." },
      { q: "Trabalho com profissionais parceiros (MEI). O sistema ajuda?", a: "Sim. Ligue em Configurações → Recursos opcionais → Trabalho com profissionais parceiros. Aparece o campo CNPJ na Equipe e a aba Salão-parceiro em Comissões, com a cota-parte de cada um e a planilha para o contador.", href: "/lei-salao-parceiro", cta: "Entenda a lei" },
    ],
  },
  {
    title: "Campanhas",
    items: [
      { q: "Como crio uma campanha?", a: "Em Campanhas, escolha um modelo pronto ou toque em Nova. 1) Quem recebe: um segmento (ex.: Sumidas) e, se quiser, refine por serviço, profissional, gênero ou tags. 2) Mensagem. 3) Voucher (opcional). Toque em Salvar e ver o público.", href: "/campanhas/nova", cta: "Nova campanha" },
      { q: "Como envio a campanha?", a: "Na campanha, toque em Preparar envio: o sistema monta uma mensagem por cliente (com o voucher pessoal de cada uma). No modo manual, envie pelo botão Enviar no WhatsApp, uma a uma. Com o WhatsApp do salão conectado, use Enviar lote." },
      { q: "Quem recebe as campanhas?", a: "Só clientes com WhatsApp cadastrado e que não pediram para sair das mensagens." },
      { q: "Como sei se a campanha deu resultado?", a: "A campanha mostra o alcance, quantas foram enviadas, quantas clientes voltaram, quantos vouchers foram usados e a receita gerada no caixa." },
    ],
  },
  {
    title: "Vouchers",
    items: [
      { q: "Qual a diferença entre voucher pessoal e genérico?", a: "O pessoal é de uma cliente só e de uso único (criado na ficha, em campanhas e nas automações). O genérico é um código para divulgar (ex.: VERAO10), com limite de usos que você define.", href: "/vouchers", cta: "Abrir Vouchers" },
      { q: "Como crio um voucher genérico?", a: "Em Vouchers → Novo voucher genérico: nome, código (vazio = o sistema gera), % ou R$, valor, pedido mínimo, limite de usos, validade e, se quiser, só para um serviço." },
      { q: "O que acontece quando o voucher vence?", a: "Ele passa a Vencido sozinho e não é mais aceito na comanda. Na lista de Vouchers, use “pausar” para suspender antes do prazo e “ativar” para voltar." },
    ],
  },
  {
    title: "Mensagens e automações",
    items: [
      { q: "O que é a fila de envio?", a: "Todas as mensagens prontas do dia (lembretes, agradecimentos, aniversários, convites de retorno). No modo manual, um toque abre o WhatsApp com o texto pronto e o sistema marca como enviada. Se mandou por fora, use “Já enviei por fora”.", href: "/mensagens", cta: "Abrir a fila" },
      { q: "Quando as mensagens automáticas são geradas?", a: "Todo dia às 8h. Se quiser na hora, toque em Gerar mensagens de hoje, na fila de envio." },
      { q: "Quais automações existem?", a: "Lembrete do horário (com link de confirmação), Agradecimento + avaliação, Convite de retorno (no ciclo do serviço), Aniversário (com voucher), Resgate de sumidas (com voucher), Pesquisa de satisfação e Fidelidade. Ligue, desligue e edite os textos em Configurações → Automações.", href: "/configuracoes/automacoes", cta: "Abrir Automações" },
      { q: "Posso mudar o texto das mensagens?", a: "Sim, em Configurações → Automações. Use as variáveis entre chaves, como {nome}, {servico}, {hora}, {data}, {profissional}, {voucher} e {link}: o sistema troca pelos dados de cada cliente." },
      { q: "As mensagens podem sair sozinhas, sem eu tocar?", a: "Sim, nos planos Pro e Mega, conectando o WhatsApp do salão por QR code (Configurações → WhatsApp do salão). A conexão está em liberação final; enquanto isso, a fila funciona no modo manual.", href: "/configuracoes/whatsapp", cta: "WhatsApp do salão" },
    ],
  },
  {
    title: "Pesquisa de satisfação e fidelidade",
    items: [
      { q: "Como funciona a pesquisa de satisfação?", a: "É opcional. Ligada, a cliente recebe um link cerca de 2 horas depois do atendimento e dá uma nota de 1 a 5. Quem dá 4 ou 5 é convidada a avaliar o salão no Google; notas de 1 a 3 viram aviso no Início para você resolver." },
      { q: "Onde vejo o resultado da pesquisa?", a: "Em Relatórios: média, porcentagem de notas 4 e 5, média por profissional e os comentários.", href: "/relatorios", cta: "Abrir Relatórios" },
      { q: "Como funciona a fidelidade?", a: "É opcional. Você define a cada quantas visitas a cliente ganha um presente (ex.: 10) e qual o voucher. Ao completar, ela recebe a mensagem com o voucher pessoal. O progresso (ex.: 7 de 10) aparece na ficha dela." },
    ],
  },
  {
    title: "Relatórios",
    items: [
      { q: "O que os relatórios mostram?", a: "No período escolhido: faturamento, ticket médio, serviços × produtos, clientes atendidas (novas × recorrentes), faltas, faturamento por dia, por profissional (com a comissão), serviços mais vendidos e meios de pagamento e descontos.", href: "/relatorios", cta: "Abrir Relatórios" },
      { q: "O que é “Retorno de clientes mês a mês”?", a: "Das clientes que vieram pela primeira vez em cada mês, quantas voltaram em até 60 dias. É o termômetro de fidelização do salão. O mês atual só fecha depois de 60 dias." },
      { q: "Como mudo o período?", a: "No topo de Relatórios, escolha as datas De e Até e toque em Aplicar." },
    ],
  },
  {
    title: "Serviços",
    items: [
      { q: "Como cadastro ou mudo um serviço?", a: "Em Serviços: nome, categoria, preço, duração, custo de insumo, comissão própria (vazio = usa a da profissional), ciclo de retorno e descrição para o agendamento online.", href: "/servicos", cta: "Abrir Serviços" },
      { q: "O que é o ciclo de retorno?", a: "De quantos em quantos dias a cliente costuma refazer o serviço (ex.: coloração a cada 35 dias). O sistema usa para prever a próxima visita, mostrar quem está atrasada e mandar o convite de retorno na época certa." },
      { q: "Como paro de oferecer um serviço sem perder o histórico?", a: "Abra o serviço e desmarque “Ativo” em vez de apagar. Ele some da agenda e do link, mas continua nos relatórios e nas fichas." },
    ],
  },
  {
    title: "Produtos e estoque",
    items: [
      { q: "Como cadastro um produto?", a: "Em Produtos: nome, marca, código, preço de venda, custo, unidade e estoque mínimo. Depois de salvar, lance a entrada de estoque na página do produto.", href: "/produtos", cta: "Abrir Produtos" },
      { q: "Como dou entrada, baixa ou ajusto o estoque?", a: "Na página do produto, em Movimentar estoque: Entrada (compra, com custo unitário), Saída/perda, Uso interno (insumo usado no serviço) ou Ajuste para contagem (corrige para o que você contou)." },
      { q: "O estoque baixa sozinho?", a: "Sim, quando o produto é vendido numa comanda paga. Produtos abaixo do estoque mínimo aparecem no Início, em Estoque baixo." },
    ],
  },
  {
    title: "Pacotes",
    items: [
      { q: "Como crio um pacote?", a: "Em Pacotes: nome, preço, validade em dias e os serviços incluídos com a quantidade (ex.: 10 escovas pelo preço de 8).", href: "/pacotes", cta: "Abrir Pacotes" },
      { q: "Como vendo e uso os créditos?", a: "Venda o pacote numa comanda (Adicionar pacote). A cliente ganha os créditos, que aparecem na ficha dela. Nas próximas visitas, o serviço do pacote é descontado do crédito na comanda." },
    ],
  },
  {
    title: "Equipe e acessos",
    items: [
      { q: "Como cadastro uma profissional?", a: "Em Equipe → + Profissional: nome, apelido, cor na agenda, % de comissão de serviço e de produto, os serviços que ela faz e se aparece no agendamento online.", href: "/equipe", cta: "Abrir Equipe" },
      { q: "A profissional tem horário diferente do salão.", a: "Na ficha dela, em Horário próprio, marque “Usar horário próprio” e ajuste os dias. O botão “Mesmo horário em todos os dias” repete o horário do primeiro dia." },
      { q: "Como dou acesso ao sistema para alguém da equipe?", a: "Na ficha da profissional, em Acesso ao sistema: e-mail de login, senha inicial (mínimo de 8 caracteres) e o perfil. Cada e-mail só pode estar em uma conta." },
      { q: "O que cada perfil pode fazer?", a: "Dona: tudo. Gerente: o dia a dia, campanhas, comissões e relatórios. Recepção: agenda de todas, clientes, comandas, caixa e fila de mensagens. Profissional: a própria agenda, comandas, ficha técnica e as próprias comissões. Financeiro: comandas, caixa, comissões e relatórios." },
      { q: "Alguém saiu da equipe. Como faço?", a: "Abra a profissional na Equipe e desmarque “Ativa”. Ela some da agenda e perde o acesso, mas o histórico de atendimentos e comissões continua." },
    ],
  },
  {
    title: "Configurações e marca",
    items: [
      { q: "Como coloco o logo e a cor do salão?", a: "Em Configurações → Marca do salão: envie o logo (PNG com fundo transparente fica melhor) e escolha a cor. A cor vale para os botões e destaques do sistema e do link de agendamento, e o logo aparece no topo, no link, no recibo e na confirmação de horário. Toque em Salvar no fim da página.", href: "/configuracoes", cta: "Abrir Configurações" },
      { q: "Como ajusto o horário de funcionamento?", a: "Em Configurações → Horário de funcionamento, marque os dias abertos e ajuste o primeiro. Toque em “Mesmo horário em todos os dias” para repetir nos outros e ajuste só o que for diferente (ex.: sábado)." },
      { q: "Para que serve o link de avaliação do Google?", a: "Vai na mensagem de agradecimento e no convite da pesquisa de satisfação, para as clientes satisfeitas avaliarem o salão no Google. Copie o link de avaliação do seu Perfil da Empresa no Google." },
      { q: "Como conecto o WhatsApp do salão?", a: "Em Configurações → WhatsApp do salão: leia e aceite o termo de uso, gere o QR code e escaneie com o celular do salão (WhatsApp → Aparelhos conectados). Depois, ligue o envio automático. Dá para desconectar quando quiser.", href: "/configuracoes/whatsapp", cta: "WhatsApp do salão" },
    ],
  },
  {
    title: "Conta, acesso e segurança",
    items: [
      { q: "Como mudo como o sistema me chama?", a: "Toque em “Olá, (seu nome)” no menu e preencha “Como você quer ser chamado(a)?”.", href: "/perfil", cta: "Meu perfil" },
      { q: "Esqueci a senha.", a: "A dona do salão define uma nova em Equipe → (profissional) → Acesso ao sistema. Se for a dona, fale com o suporte pelo WhatsApp." },
      { q: "A profissional não vê uma tela.", a: "Cada perfil vê só o que precisa. A dona ajusta o perfil em Equipe → Acesso ao sistema." },
      { q: "Meus dados e os das minhas clientes estão seguros?", a: "Cada salão é isolado no banco de dados: nenhum salão vê dados de outro. O acesso é por login individual, e a cliente pode pedir para sair das mensagens a qualquer momento, conforme a LGPD." },
      { q: "Posso usar em vários aparelhos ao mesmo tempo?", a: "Sim. Recepção no computador e profissionais no celular, tudo atualizado para todos." },
    ],
  },
];
