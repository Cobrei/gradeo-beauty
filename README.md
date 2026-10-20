# gradeo beauty — gestão e retenção para salões, barbearias e estética

> Produto da gradeo. Marca em minúsculas; o "o" final é um espelho (ver `src/components/ui/logo.tsx`). Tagline: *Suas clientes de volta, sua agenda cheia.*

Posicionamento: não é "mais uma agenda". É a máquina de retenção do salão — CRM com histórico real da cliente + campanhas e vouchers rastreados até o caixa — com agenda, comanda, caixa, estoque e comissões junto. Modo manual de WhatsApp funciona no dia 1, sem custo e sem comissão sobre a base da dona.

## O que está pronto (v1)
- **Cadastro self-service em 3 passos** (`/cadastro`): tipo de negócio → serviços prontos com preço/tempo/ciclo de retorno → equipe e acesso. Cria salão, papéis, serviços, profissionais e automações padrão. PWA instalável (manifest + ícone).
- **Agenda** por profissional (dia), encaixe forçado, bloqueios, pedidos online para confirmar, lista de espera que mostra quem encaixa quando um horário vaga, remarcação, link de confirmação pelo WhatsApp.
- **Agendamento público** `/agendar/<slug>`: serviço → profissional → dia/horário livres → nome + WhatsApp. Cria a cliente e entra como "Pedido online".
- **Comanda**: abre sozinha ao finalizar o atendimento; serviços, produtos (baixa estoque), pacotes (gera créditos), crédito de pacote, desconto manual, voucher (pessoal ou genérico), pagamento multi-meio, recibo por WhatsApp. Comanda paga é imutável (trigger).
- **Caixa**: abertura com fundo, sangria/suprimento, fechamento com conferência e histórico de diferenças.
- **Comissões**: calculadas item a item (serviço usa % do serviço ou da profissional; produto usa % de produto; crédito de pacote comissiona o preço cheio), fechamento por período e marcação de pagamento. Profissional vê só as próprias.
- **CRM**: ficha com visitas, gasto, ticket, última visita, ritmo (intervalo médio) e previsão de retorno; histórico unificado (comandas + agenda); ficha técnica (fórmula, alergia — destacada em vermelho —, preferência); mensagens recebidas; créditos e vouchers; opt-out LGPD; voucher pessoal em 1 clique. Segmentos automáticos: Sumidas, Atrasadas no ciclo, Aniversariantes, VIP, Vieram só uma vez, Novas. Importação CSV/VCF/texto colado com dedup por telefone.
- **Campanhas**: 8 modelos prontos; público por segmento (+ refino por gênero, serviço, profissional, tags); mensagem com variáveis; voucher pessoal de uso único por cliente; preparo → fila → envio manual (`/m/<id>` abre o WhatsApp e já marca enviada) ou automático (WhatsApp Cloud API em lotes); resultado: enviadas, quem voltou, vouchers usados, receita gerada.
- **Automações** (cron horário): lembrete 24h, agradecimento + avaliação, convite de retorno no ciclo do serviço, aniversário com voucher, resgate de sumidas. Vouchers vencidos expiram sozinhos.
- **Relatórios**: faturamento por dia/profissional/serviço/meio, ticket, novas × recorrentes, faltas, descontos, coortes de retenção (60 dias).
- **Painel**: faturado hoje/mês, atendimentos, sumidas com valor estimado, mensagens pendentes, próximos atendimentos, aniversários da semana com botão de parabenizar, estoque baixo, link de agendamento.
- Perfis: Dona, Gerente, Recepção, Profissional, Financeiro (permissões em `src/lib/permissions.ts`).

## Rodar localmente
```bash
# PostgreSQL 16 com banco "beauty" (usuário/senha beauty) e "beauty_test"
npm install
cp .env.example .env.local
npm run db:migrate && npm run db:seed
npm run dev          # http://localhost:3000 — dona@salao.demo / gradeo123
```

## Qualidade
```bash
npm test                              # Vitest (regras de comanda)
npm run lint && npm run build
BASE=http://localhost:3000 CHROME=/caminho/chromium node e2e/fluxo-salao.mjs
# login → agenda → agendar → iniciar → finalizar → comanda → receber → ficha → nota técnica →
# segmentos → campanha (modelo, preparar, links) → caixa → relatórios → comissões →
# agendamento público → pedido na agenda → automações. ~11 s, com screenshots em e2e/shots/.
```

## Estrutura
```
src/
  app/            rotas (App Router): (app)/* área logada · cadastro · login · agendar/[slug] · m/[id] · api/jobs
  components/ui   design system leve (tokens em globals.css, logo, Form único de cliente)
  config/brand.ts marca
  db/             client, schema por módulo (core, salon, crm, agenda, pos, marketing), migrations, seed
  lib/            contexto de tenant (RLS por transação), permissões, dinheiro em centavos, datas, fuso, telefone
  modules/<m>/    domain · application · ui(actions)
```
Multi-tenant por Row-Level Security (`set_config('app.tenant_id')` em toda transação). Dinheiro em centavos no domínio, `numeric(19,4)` no banco. Horários em `timestamptz`, sempre exibidos no fuso do salão.

## Próximos passos sugeridos
1. Fotos na ficha técnica (upload para Vercel Blob) e na página pública.
2. Sinal via Pix para reduzir falta (Asaas/Mercado Pago) e clube de assinatura mensal.
3. NFS-e nacional (obrigatória para ME/EPP do Simples a partir de 01/11/2026) — emissor via API do portal nacional.
4. App da cliente (ver histórico, remarcar, vouchers) e avaliação pós-atendimento dentro do sistema.
5. Templates aprovados na Meta para envio automático fora da janela de 24h.
