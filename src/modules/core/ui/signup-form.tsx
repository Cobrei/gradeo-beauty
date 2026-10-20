"use client";
import { formatBRL } from "@/lib/money";
import { useActionState, useState } from "react";
import type { ActionResult } from "@/lib/errors";
import type { ServicePreset } from "@/modules/catalog/domain/presets";

interface Props {
  segments: { key: string; label: string; services: ServicePreset[] }[];
  action: (prev: ActionResult<unknown> | null, fd: FormData) => Promise<ActionResult<unknown>>;
}

/** Cadastro em 3 passos, uma tela só: negócio → serviços → acesso. */
export function SignupForm({ segments, action }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [segment, setSegment] = useState(segments[0].key);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set(segments[0].services.map((s) => s.name)));
  const [pros, setPros] = useState<string[]>([""]);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const seg = segments.find((s) => s.key === segment)!;

  function pickSegment(key: string) {
    setSegment(key);
    setSelected(new Set(segments.find((s) => s.key === key)!.services.map((s) => s.name)));
  }
  function toggle(name: string) {
    const n = new Set(selected);
    if (n.has(name)) n.delete(name);
    else n.add(name);
    setSelected(n);
  }

  return (
    <form action={formAction} className="space-y-5">
      {state && !state.ok && (
        <div role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
          {state.message}
        </div>
      )}
      <ol className="flex gap-2 text-xs font-bold uppercase tracking-wide text-muted">
        {["Seu negócio", "Serviços", "Equipe e acesso"].map((l, i) => (
          <li key={l} className={`flex-1 border-t-2 pt-2 ${step >= i + 1 ? "border-brand text-brand" : "border-line"}`}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>

      <section className={step === 1 ? "space-y-4" : "hidden"}>
        <div>
          <label className="label" htmlFor="salonName">Nome do salão / estúdio</label>
          <input id="salonName" name="salonName" required className="field" placeholder="Ex.: Studio Ana Hair" />
          {errors.salonName && <p className="mt-1 text-xs font-semibold text-bad">{errors.salonName}</p>}
        </div>
        <div>
          <span className="label">Tipo de negócio</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {segments.map((s) => (
              <button type="button" key={s.key} onClick={() => pickSegment(s.key)} className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${segment === s.key ? "border-brand bg-brand-soft text-brand" : "border-line bg-white"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="segment" value={segment} />
        </div>
        <button type="button" onClick={() => setStep(2)} className="btn btn-primary w-full">
          Continuar
        </button>
      </section>

      <section className={step === 2 ? "space-y-4" : "hidden"}>
        <p className="text-sm text-muted">Marque o que você faz. Preços e tempos vêm prontos e você ajusta depois.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {seg.services.map((s) => (
            <label key={s.name} className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm ${selected.has(s.name) ? "border-brand bg-brand-soft" : "border-line bg-white"}`}>
              <span className="flex items-center gap-2">
                <input type="checkbox" name="serviceNames" value={s.name} checked={selected.has(s.name)} onChange={() => toggle(s.name)} className="h-4 w-4 accent-[#b8475f]" />
                <span className="font-semibold">{s.name}</span>
              </span>
              <span className="text-xs text-muted">
                {s.durationMin} min · {formatBRL(Math.round(s.price * 100))}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
            Voltar
          </button>
          <button type="button" onClick={() => setStep(3)} className="btn btn-primary flex-1">
            Continuar
          </button>
        </div>
      </section>

      <section className={step === 3 ? "space-y-4" : "hidden"}>
        <div>
          <span className="label">Quem atende (além de você)</span>
          <div className="space-y-2">
            {pros.map((p, i) => (
              <input key={i} name="professionals" value={p} onChange={(e) => setPros(pros.map((x, j) => (j === i ? e.target.value : x)))} className="field" placeholder={i === 0 ? "Nome da profissional (opcional)" : "Outra profissional"} />
            ))}
          </div>
          <button type="button" onClick={() => setPros([...pros, ""])} className="mt-2 text-sm font-semibold text-brand">
            + adicionar profissional
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ownerName">Seu nome</label>
            <input id="ownerName" name="ownerName" required className="field" />
            {errors.ownerName && <p className="mt-1 text-xs font-semibold text-bad">{errors.ownerName}</p>}
          </div>
          <div>
            <label className="label" htmlFor="phone">Seu WhatsApp</label>
            <input id="phone" name="phone" required inputMode="tel" className="field" placeholder="(51) 99999-9999" />
            {errors.phone && <p className="mt-1 text-xs font-semibold text-bad">{errors.phone}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">E-mail (seu login)</label>
            <input id="email" name="email" type="email" required autoComplete="username" className="field" />
            {errors.email && <p className="mt-1 text-xs font-semibold text-bad">{errors.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
            {errors.password && <p className="mt-1 text-xs font-semibold text-bad">{errors.password}</p>}
          </div>
        </div>
        <p className="text-xs text-muted">Ao iniciar o teste você concorda com o uso dos dados das suas clientes só para o seu salão, conforme a LGPD. Elas podem pedir para sair das mensagens a qualquer momento.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(2)} className="btn btn-secondary">
            Voltar
          </button>
          <button type="submit" disabled={pending} className="btn btn-primary flex-1">
            {pending ? "Preparando seu acesso…" : "Iniciar teste grátis"}
          </button>
        </div>
      </section>
    </form>
  );
}
