import Link from "next/link";
import { PoweredBy } from "@/components/ui/salon-brand";

export const metadata = {
  title: "Lei do Salão-Parceiro (Lei 13.352/2016): o que é e como funciona",
  description: "Entenda a Lei do Salão-Parceiro: cota-parte, contrato de parceria, homologação, impostos e quando vira vínculo de emprego. Explicado de forma simples para donos de salão.",
};

const CLAUSULAS = [
  "o percentual que o salão retém de cada serviço (a cota-parte do salão);",
  "que o salão retém e recolhe os tributos e contribuições do profissional sobre a parte dele;",
  "como e quando o profissional recebe, por tipo de serviço;",
  "o que o profissional pode usar (bens, materiais) e por onde pode circular no salão;",
  "a possibilidade de encerrar a parceria por qualquer lado, com aviso prévio de pelo menos 30 dias;",
  "quem cuida da manutenção e higiene dos materiais e equipamentos, das condições de funcionamento e do atendimento às clientes;",
  "o dever do profissional de manter a inscrição dele regular na Receita (CNPJ em dia).",
];

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export default function LeiSalaoParceiro() {
  return (
    <main className="min-h-dvh bg-mist">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <div>
          <Link href="/" className="text-sm font-semibold text-brand">← gradeo beauty</Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight [text-wrap:balance]">Lei do Salão-Parceiro (Lei nº 13.352/2016)</h1>
          <p className="mt-2 text-sm text-ink-2">A lei que permite ao salão trabalhar com cabeleireiras, barbeiros, manicures, esteticistas, depiladoras e maquiadoras como <b>parceiros</b>, e não como empregados, dividindo o valor de cada serviço. Explicada em linguagem simples.</p>
        </div>

        <Sec title="O que é">
          <p>A lei criou o <b>contrato de parceria</b> entre o <b>salão-parceiro</b> e o <b>profissional-parceiro</b>. O salão oferece a estrutura (espaço, equipamentos, agenda, recepção, cobrança) e o profissional presta o serviço de beleza. O valor de cada atendimento é dividido entre os dois, em percentuais combinados no contrato.</p>
          <p>Enquanto a parceria for real e seguir a lei, <b>não há vínculo de emprego nem sociedade</b> entre o salão e o profissional (art. 1º-A, § 11).</p>
        </Sec>

        <Sec title="Como funciona o dinheiro (cota-parte)">
          <p>O salão <b>recebe o pagamento inteiro</b> da cliente (art. 1º-A, § 2º), fica com a parte dele e repassa a parte do profissional.</p>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Exemplo: coloração de R$ 200,00, parceria 50/50</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-lg font-extrabold">R$ 200,00</div><div className="text-xs text-muted">a cliente paga ao salão</div></div>
              <div><div className="text-lg font-extrabold text-brand">R$ 100,00</div><div className="text-xs text-muted">cota-parte do profissional</div></div>
              <div><div className="text-lg font-extrabold">R$ 100,00</div><div className="text-xs text-muted">cota-parte do salão</div></div>
            </div>
          </div>
          <p>A parte do salão é tratada como aluguel de bens e utensílios e/ou serviços de gestão, apoio administrativo, cobrança e recebimento. A parte do profissional é a remuneração pelo serviço de beleza (art. 1º-A, § 4º).</p>
        </Sec>

        <Sec title="O efeito nos impostos">
          <p>A cota-parte do profissional <b>não entra na receita bruta do salão</b>, mesmo quando o salão emite uma nota fiscal única para a cliente (art. 1º-A, § 5º). Na prática, o salão paga imposto só sobre a parte dele: no exemplo, sobre R$ 100,00, e não sobre R$ 200,00.</p>
          <p>Em geral, a nota sai pelo valor total, com o repasse ao profissional e o CNPJ dele informados (normalmente no campo de deduções). <b>A forma exata varia de município para município</b>: combine com o seu contador.</p>
          <p>O profissional pode ser <b>MEI, microempresa ou pequena empresa</b> (art. 1º-A, § 7º) e cuida dos próprios impostos sobre a parte dele. A lei prevê que o salão retenha e recolha esses tributos quando houver.</p>
        </Sec>

        <Sec title="O que é obrigatório">
          <ul className="list-disc space-y-1 pl-5">
            <li>Contrato <b>por escrito</b>, assinado na frente de <b>duas testemunhas</b> (art. 1º-A, § 8º).</li>
            <li>Contrato <b>homologado no sindicato</b> da categoria (salões e profissionais). Onde não houver sindicato, no órgão local do Ministério do Trabalho (§ 8º).</li>
            <li>Profissional com <b>CNPJ</b> regular (MEI ou ME).</li>
            <li>O salão deve manter condições adequadas de trabalho, equipamentos e instalações, seguindo as normas de segurança e saúde (art. 1º-B).</li>
          </ul>
          <p className="pt-1 font-semibold text-ink">O contrato precisa ter, no mínimo (art. 1º-A, § 10):</p>
          <ol className="list-decimal space-y-1 pl-5">
            {CLAUSULAS.map((c) => <li key={c}>{c}</li>)}
          </ol>
        </Sec>

        <Sec title="Quando vira vínculo de emprego (cuidado)">
          <p>A lei diz que existe vínculo de emprego quando (art. 1º-C):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>não há contrato de parceria formalizado como a lei manda (por escrito, com testemunhas e homologado); ou</li>
            <li>o profissional faz funções diferentes das que estão no contrato (por exemplo, a manicure parceira que também atende a recepção).</li>
          </ul>
          <p>Em outubro de 2021 o STF confirmou que a lei é constitucional (ADI 5.625), mas fixou que o contrato é <b>nulo quando usado para disfarçar uma relação de emprego</b>. Ou seja: se na prática há subordinação, horário imposto, controle e exclusividade como de empregado, a Justiça pode reconhecer o vínculo, mesmo com contrato assinado.</p>
        </Sec>

        <Sec title="Como o gradeo beauty ajuda">
          <ul className="list-disc space-y-1 pl-5">
            <li>Percentual de cada profissional em serviços e produtos, calculado item a item em cada comanda paga.</li>
            <li>CNPJ do profissional parceiro no cadastro da Equipe.</li>
            <li>Relatório <b>Salão-parceiro</b> em Comissões: total recebido, cota-parte do profissional e cota-parte do salão no período, com planilha para o contador.</li>
            <li>Fechamento do período para fixar os valores e marcar o repasse como pago.</li>
          </ul>
          <p>Para usar, ligue <b>Configurações → Recursos opcionais → Trabalho com profissionais parceiros</b>.</p>
        </Sec>

        <section className="rounded-2xl border border-line bg-white p-4 text-xs leading-relaxed text-muted">
          Texto informativo, em linguagem simples, com base na Lei nº 12.592/2012, alterada pela Lei nº 13.352/2016 (arts. 1º-A a 1º-D). Não substitui orientação do seu contador ou advogado. Leia o texto oficial em{" "}
          <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13352.htm" target="_blank" rel="noopener" className="font-semibold text-brand underline">planalto.gov.br (Lei 13.352/2016)</a>.
        </section>

        <div className="pt-2 text-center"><PoweredBy /></div>
      </div>
    </main>
  );
}
