import Image from "next/image";
import Link from "next/link";
import { Logo, MirrorO } from "@/components/ui/logo";
import { MODULES } from "@/components/ui/modules";
import { BRAND } from "@/config/brand";
import { FEATURES, PLANS, PROMO_NOTE, TRIAL_DAYS, brl, type Cell } from "@/config/plans";
import { getActor } from "@/modules/core/application/auth";

export const metadata = {
  title: { absolute: "gradeo beauty · Sistema para salão de beleza, barbearia e estética" },
  description:
    "Agenda, comanda, caixa, comissões e um CRM que traz a cliente de volta: campanhas e vouchers pelo WhatsApp, medidos até o caixa. Teste grátis.",
};

const WA = `https://wa.me/${BRAND.supportWhatsApp}?text=${encodeURIComponent("Olá! Quero conhecer o gradeo beauty.")}`;

const STEPS = [
  { n: "1", t: "Cada visita vira histórico", d: "A comanda fecha e a ficha da cliente atualiza sozinha: serviços, gasto, fórmula, alergia, profissional preferida." },
  { n: "2", t: "O sistema percebe quem sumiu", d: "Pelo ritmo de cada cliente e o ciclo de cada serviço, o gradeo separa quem está atrasada, quem faz aniversário e quem veio só uma vez." },
  { n: "3", t: "Você chama de volta e mede", d: "Monte uma campanha com voucher pessoal em 2 minutos. O gradeo mostra quem voltou e quanto entrou no caixa." },
];

const FAQ = [
  { q: "Preciso instalar alguma coisa?", a: "Não. O gradeo beauty abre no navegador do celular, tablet ou computador. No celular dá para adicionar à tela inicial e usar como um app." },
  { q: "Como funcionam as mensagens de WhatsApp?", a: "No modo manual, que já vem ligado e não tem custo, um toque abre o WhatsApp com a mensagem pronta e o sistema marca como enviada. Nos planos Pro e Mega, o envio automático pelo WhatsApp oficial do próprio salão está chegando." },
  { q: "Consigo trazer minhas clientes de outro sistema?", a: "Sim. Importe uma planilha, a lista de contatos do celular ou cole o texto. O gradeo junta duplicadas pelo telefone." },
  { q: "Cada pessoa da equipe tem o próprio acesso?", a: "Sim. Há perfis de dona, gerente, recepção, profissional e financeiro, cada um com o que precisa para trabalhar." },
  { q: "Tem fidelidade ou multa?", a: "Não. Você paga mês a mês e cancela quando quiser." },
  { q: "A cliente pode pedir para não receber mensagens?", a: "Sim. Um clique na ficha marca a cliente como fora das campanhas e o sistema respeita em todos os envios." },
];

export default async function Home() {
  // quem já tem conta também vê o site (não redireciona); o topo oferece abrir o sistema
  const logged = !!(await getActor());

  return (
    <div className="bg-[#fcfafb] text-ink">
      {/* topo */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-[#fcfafb]/90 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-8">
          <Link href="/" aria-label="gradeo beauty, início">
            <Logo size={24} />
          </Link>
          <nav className="hidden gap-6 text-sm font-semibold text-ink-2 md:flex">
            <a href="#como" className="hover:text-brand">Como funciona</a>
            <a href="#recursos" className="hover:text-brand">Recursos</a>
            <a href="#planos" className="hover:text-brand">Planos</a>
            <a href="#perguntas" className="hover:text-brand">Perguntas</a>
          </nav>
          <div className="flex-1" />
          {logged ? (
            <Link href="/painel" className="btn btn-primary btn-sm">Abrir o sistema</Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-ink-2 hover:text-brand">Entrar</Link>
              <Link href="/cadastro" className="btn btn-primary btn-sm hidden sm:inline-flex">Testar grátis</Link>
            </>
          )}
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-soft/70 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -left-32 top-64 h-[360px] w-[360px] rounded-full bg-gold-soft/80 blur-3xl" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.05fr_1fr] md:px-8 md:pb-24 md:pt-20">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand shadow-sm">
                <MirrorO size={14} /> Salão · Barbearia · Estética
              </p>
              <h1 className="text-[2.6rem] font-extrabold leading-[1.02] tracking-tight [text-wrap:balance] md:text-6xl">
                Suas clientes de volta, <span className="text-brand">sua agenda cheia.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
                Agenda, comanda, caixa e comissões num só lugar, e um CRM que avisa quem sumiu e traz de volta com campanhas e vouchers pelo WhatsApp, medidos até o caixa.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/cadastro" className="btn btn-primary px-6 text-lg">Criar meu salão grátis</Link>
                <a href={WA} target="_blank" rel="noopener" className="btn btn-secondary px-6 text-lg">Pedir uma demonstração</a>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink-2">
                <li>✓ Cadastro em 3 minutos</li>
                <li>✓ Funciona no celular</li>
                <li>✓ {TRIAL_DAYS} dias grátis, sem cartão</li>
              </ul>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-20px_rgba(35,26,41,.35)]">
                <div className="flex items-center gap-1.5 border-b border-line bg-mist px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e8a0ad]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e9c89a]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#a8d5c4]" />
                  <span className="ml-3 truncate text-[11px] text-muted">gradeo.com.br · Studio Bela</span>
                </div>
                <Image src="/landing/painel-main.png" alt="Painel do gradeo beauty com atalhos coloridos, faturamento do dia e clientes sumidas" width={1040} height={900} priority className="h-auto w-full" />
              </div>
              <div className="absolute -bottom-10 -right-3 hidden w-36 overflow-hidden rounded-[1.6rem] border-[6px] border-ink bg-white shadow-2xl sm:block md:-right-6 md:w-40">
                <Image src="/landing/celular.png" alt="gradeo beauty no celular" width={400} height={860} className="h-auto w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* dor */}
        <section className="bg-ink text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3 md:px-8">
            <div className="md:col-span-1">
              <h2 className="text-3xl font-extrabold leading-tight [text-wrap:balance]">A cliente some e ninguém percebe.</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 md:col-span-2">
              <p className="text-white/80">Ela fazia escova todo mês. Faz três meses que não aparece. A agenda de papel não avisa, e o WhatsApp tem mil conversas. Ela foi para o salão da esquina.</p>
              <p className="text-white/80">O gradeo beauty olha a sua base todo dia e mostra quem está atrasada no ciclo, quanto isso vale em reais e qual mensagem mandar. <strong className="text-[#e9c89a]">Uma campanha de retorno paga o mês do sistema.</strong></p>
            </div>
          </div>
        </section>

        {/* como funciona */}
        <section id="como" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Como funciona</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight [text-wrap:balance] md:text-4xl">A máquina de retenção do seu salão</h2>
            <div className="mt-10 grid items-start gap-10 md:grid-cols-2">
              <ol className="space-y-6">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">{s.n}</span>
                    <div>
                      <h3 className="text-lg font-bold">{s.t}</h3>
                      <p className="mt-1 text-ink-2">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <figure className="overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
                <Image src="/landing/campanha.png" alt="Campanha de retorno com voucher pessoal para 21 clientes sumidas" width={1040} height={860} className="h-auto w-full" />
                <figcaption className="border-t border-line px-4 py-3 text-sm text-muted">Campanha “Sentimos sua falta”: 21 clientes, voucher pessoal de 15%, mensagem pronta para cada uma.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* recursos */}
        <section id="recursos" className="scroll-mt-20 bg-mist">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Recursos</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight [text-wrap:balance] md:text-4xl">Tudo que o salão usa no dia, numa tela só</h2>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {MODULES.filter((m) => m.href !== "/configuracoes").map((m) => (
                <div key={m.href} className="rounded-[var(--radius-card)] bg-white p-4 shadow-[0_1px_2px_rgba(35,26,41,.05),0_4px_16px_rgba(35,26,41,.05)]">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.12)]" style={{ background: m.color }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={m.icon} />
                    </svg>
                  </span>
                  <div className="font-bold">{m.label}</div>
                  <div className="mt-0.5 text-sm leading-snug text-muted">{m.hint}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ficha + agendamento */}
        <section>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
            <figure className="overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
              <Image src="/landing/ficha-main.png" alt="Ficha da cliente com visitas, gasto, ticket médio e histórico" width={1040} height={860} className="h-auto w-full" />
            </figure>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Ficha da cliente</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight [text-wrap:balance]">Você conhece cada cliente como se fosse a única</h2>
              <ul className="mt-6 space-y-3 text-ink-2">
                <li><strong className="text-ink">Histórico completo:</strong> todos os serviços, produtos e quem atendeu.</li>
                <li><strong className="text-ink">Ficha técnica:</strong> fórmula da cor, preferências e alergia em destaque vermelho.</li>
                <li><strong className="text-ink">Ritmo e previsão de retorno:</strong> o sistema sabe quando ela deveria voltar.</li>
                <li><strong className="text-ink">Voucher em um clique:</strong> crie um desconto pessoal e mande pelo WhatsApp.</li>
              </ul>
            </div>
          </div>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 md:grid-cols-[1fr_auto] md:px-8 md:pb-24">
            <div className="md:order-1">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">Agendamento online</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight [text-wrap:balance]">A cliente marca sozinha, até de madrugada</h2>
              <p className="mt-4 max-w-xl text-ink-2">Seu salão ganha um link próprio para pôr na bio do Instagram e no WhatsApp. A cliente escolhe serviço, profissional e horário livre; o pedido cai na sua agenda para confirmar. Sem comissão por agendamento.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/agendar/studio-bela" className="btn btn-secondary">Ver um link de agendamento</Link>
              </div>
            </div>
            <div className="mx-auto w-56 overflow-hidden rounded-[2rem] border-[7px] border-ink bg-white shadow-2xl md:order-2">
              <Image src="/landing/agendar.png" alt="Página de agendamento online no celular" width={420} height={860} className="h-auto w-full" />
            </div>
          </div>
        </section>

        {/* whatsapp */}
        <section className="bg-gradient-to-br from-[#25d366]/10 via-white to-brand-soft/50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3 md:px-8">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight [text-wrap:balance]">WhatsApp funcionando no primeiro dia</h2>
            </div>
            <p className="text-ink-2">Lembrete de horário, agradecimento, convite de retorno no ciclo do serviço e parabéns com voucher. As mensagens ficam prontas numa fila; um toque abre o WhatsApp e já marca como enviada.</p>
            <p className="text-ink-2">Sem custo por mensagem no modo manual e sem pagar comissão sobre a sua própria base. Em breve, o envio automático pelo WhatsApp oficial do próprio salão: as mensagens saem do seu número.</p>
          </div>
        </section>

        {/* planos */}
        <section id="planos" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-brand">Planos</p>
            <h2 className="mx-auto mt-2 max-w-2xl text-center text-3xl font-extrabold tracking-tight [text-wrap:balance] md:text-4xl">Comece pequeno, cresça quando quiser</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-ink-2">{PROMO_NOTE}</p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {PLANS.map((p) => (
                <div key={p.id} className={`relative flex flex-col rounded-2xl border bg-white p-6 ${p.highlight ? "border-brand shadow-[0_20px_50px_-20px_rgba(184,71,95,.45)]" : "border-line"}`}>
                  {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-0.5 text-xs font-bold text-white">Mais escolhido</span>}
                  <h3 className="text-xl font-extrabold">{p.name}</h3>
                  <p className="text-sm text-muted">{p.who}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tabular-nums">R$ {brl(p.price)}</span>
                    <span className="text-muted">/mês</span>
                  </div>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-2">
                    {p.items.map((i) => (
                      <li key={i} className="flex gap-2"><span className="text-ok">✓</span>{i}</li>
                    ))}
                  </ul>
                  <Link href={`/cadastro?plano=${p.id}`} className={`btn mt-6 ${p.highlight ? "btn-primary" : "btn-secondary"}`}>Testar {TRIAL_DAYS} dias grátis</Link>
                </div>
              ))}
            </div>

            <h3 className="mt-16 text-center text-2xl font-extrabold tracking-tight">Compare o que vem em cada plano</h3>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-mist text-left">
                    <th className="px-4 py-3 font-bold">Recurso</th>
                    {PLANS.map((p) => (
                      <th key={p.id} className={`w-32 px-3 py-3 text-center font-extrabold ${p.highlight ? "text-brand" : ""}`}>
                        {p.name}
                        <div className="text-xs font-semibold text-muted">R$ {brl(p.price)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((f) => (
                    <FeatureLine key={f.label} group={f.group} label={f.label} cells={[f.basic, f.pro, f.mega]} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-sm text-muted">
              “Em breve” são recursos em desenvolvimento, sem custo extra quando chegarem. Mais de 12 profissionais ou várias unidades: <a href={WA} target="_blank" rel="noopener" className="font-semibold text-brand underline">fale com a gente</a>.
            </p>
          </div>
        </section>

        {/* perguntas */}
        <section id="perguntas" className="scroll-mt-20 bg-mist">
          <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="text-center text-3xl font-extrabold tracking-tight">Perguntas frequentes</h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-xl bg-white p-4 shadow-sm open:shadow-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {f.q}
                    <span className="text-brand transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* chamada final */}
        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center md:px-8">
            <MirrorO size={48} ring="#e58aa0" />
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight [text-wrap:balance] md:text-4xl">Comece hoje e mande a primeira campanha antes do fim do dia.</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/cadastro" className="btn btn-primary px-6 text-lg">Criar meu salão grátis</Link>
              <a href={WA} target="_blank" rel="noopener" className="btn btn-wa px-6 text-lg">Falar no WhatsApp</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted md:px-8">
          <Logo size={18} />
          <span>
            Um sistema da <a href="https://gradeo.com.br" className="font-semibold text-ink-2 hover:text-brand">gradeo</a> · Porto Alegre, RS · WhatsApp (51) 99373-5007
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureLine({ group, label, cells }: { group?: string; label: string; cells: Cell[] }) {
  return (
    <>
      {group && (
        <tr className="bg-[#fcfafb]">
          <td colSpan={4} className="px-4 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-brand">{group}</td>
        </tr>
      )}
      <tr className="border-t border-line/70">
        <td className="px-4 py-2.5 text-ink-2">{label}</td>
        {cells.map((c, i) => (
          <td key={i} className="px-3 py-2.5 text-center">
            {c === true ? <span className="font-bold text-ok" aria-label="incluso">✓</span> : c === false ? <span className="text-line" aria-label="não incluso">—</span> : c === "em breve" ? <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-bold text-[#8a6420]">em breve</span> : <span className="font-semibold">{c}</span>}
          </td>
        ))}
      </tr>
    </>
  );
}
