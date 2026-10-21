import Link from "next/link";
import { brandStyle } from "@/lib/brand-style";
import { notFound } from "next/navigation";
import { PoweredBy, SalonMark } from "@/components/ui/salon-brand";
import { publicCatalog, publicSlots } from "@/modules/agenda/application/public-booking";
import { publicBookAction } from "@/modules/agenda/ui/public-actions";
import { fromCents, toCents, formatBRL } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { addDays, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import { ReceptionistChat } from "@/components/ui/receptionist-chat";
import { receptionistAvailable } from "@/modules/marketing/application/receptionist";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicCatalog(slug);
  return { title: data ? `Agendar · ${data.salon.salonName}` : "Agendamento" };
}

export default async function AgendarPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await publicCatalog(slug);
  if (!data) notFound();
  const { salon, services, professionals } = data;
  const today = todayISO();
  const service = services.find((s) => s.id === sp.s);
  const pros = service ? professionals.filter((p) => !p.serviceIds.length || p.serviceIds.includes(service.id)) : professionals;
  const pro = pros.find((p) => p.id === sp.p);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") && sp.d! >= today ? sp.d! : today;
  const slots = service && pro ? await publicSlots(slug, date, pro.id, service.id) : [];
  const time = slots.includes(sp.t ?? "") ? sp.t : undefined;
  const base = `/agendar/${slug}`;
  const q = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ s: sp.s, p: sp.p, d: sp.d, t: sp.t, ...o })) if (v) u.set(k, v);
    return `${base}?${u.toString()}`;
  };
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i)).filter((d) => salon.openingHours[String(weekdayOf(d))]);
  const cats = [...new Set(services.map((s) => s.category))];
  const aiOn = salon.aiReceptionist && receptionistAvailable();
  const step = sp.ok ? 5 : !service ? 1 : !pro ? 2 : !time ? 3 : 4;

  return (
    <main className="min-h-dvh bg-mist" style={brandStyle(salon.brandColor)}>
      <div className={`mx-auto max-w-lg px-4 py-6 ${aiOn ? "pb-24" : ""}`}>
        <header className="mb-5 flex flex-col items-center text-center">
          <SalonMark name={salon.salonName} logo={salon.logoData} color={salon.brandColor} size={salon.logoData ? 72 : 56} showName={false} />
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{salon.salonName}</h1>
          <p className="text-sm text-muted">{(salon.addressJson as { text?: string } | null)?.text ?? ""}{salon.instagram ? ` · @${salon.instagram}` : ""}</p>
        </header>

        {step === 5 ? (
          <div className="card text-center">
            <div className="mb-2 text-4xl">💐</div>
            <h2 className="text-xl font-bold">Pedido enviado!</h2>
            <p className="mt-1 text-sm text-ink-2">O {salon.salonName} vai confirmar seu horário pelo WhatsApp em breve.</p>
            {salon.whatsapp && <a href={`https://wa.me/55${salon.whatsapp}`} className="btn btn-wa mt-4 w-full">Falar com o salão</a>}
            <Link href={base} className="mt-3 block text-sm text-brand">Agendar outro horário</Link>
          </div>
        ) : (
          <>
            <ol className="mb-4 grid grid-cols-4 gap-1 text-[11px] font-bold uppercase tracking-wide text-muted">
              {["Serviço", "Profissional", "Horário", "Seus dados"].map((l, i) => (
                <li key={l} className={`border-t-2 pt-1 ${step > i ? "border-brand text-brand" : "border-line"}`}>{l}</li>
              ))}
            </ol>
            {(service || pro || time) && (
              <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
                {service && <Link href={base} className="chip chip-on">{service.name} ✕</Link>}
                {pro && <Link href={q({ p: undefined, t: undefined })} className="chip chip-on">{pro.nickname ?? pro.name} ✕</Link>}
                {time && <Link href={q({ t: undefined })} className="chip chip-on">{date.split("-").reverse().slice(0, 2).join("/")} {time} ✕</Link>}
              </div>
            )}

            {step === 1 && cats.map((cat) => (
              <section key={cat} className="mb-4">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{cat}</h2>
                <div className="space-y-2">
                  {services.filter((s) => s.category === cat).map((s) => (
                    <Link key={s.id} href={q({ s: s.id })} className="card flex items-center justify-between gap-3 hover:ring-2 hover:ring-brand/40">
                      <div><div className="font-semibold">{s.name}</div><div className="text-xs text-muted">{s.durationMin} min{s.description ? ` · ${s.description}` : ""}</div></div>
                      <div className="font-bold">{toCents(s.price) > 0 ? `${formatBRL(toCents(s.price))}` : "consultar"}</div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-2">
                {pros.map((p) => (
                  <Link key={p.id} href={q({ p: p.id })} className="card flex flex-col items-center gap-2 py-5 text-center hover:ring-2 hover:ring-brand/40">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: p.color }}>{p.name[0]}</span>
                    <span className="font-semibold">{p.nickname ?? p.name}</span>
                  </Link>
                ))}
                {pros.length === 0 && <p className="col-span-2 text-sm text-muted">Nenhuma profissional disponível online para este serviço. Fale com o salão.</p>}
              </div>
            )}

            {step === 3 && (
              <>
                <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
                  {days.map((d) => (
                    <Link key={d} href={q({ d, t: undefined })} className={`flex min-w-14 flex-col items-center rounded-xl border px-2 py-2 text-xs ${d === date ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>
                      <span className="uppercase">{WEEKDAYS_SHORT[weekdayOf(d)]}</span>
                      <span className="text-base font-bold">{d.slice(8)}</span>
                    </Link>
                  ))}
                </div>
                {slots.length === 0 ? <p className="card text-sm text-muted">Sem horários nesse dia. Tente outro.</p> : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((t) => <Link key={t} href={q({ d: date, t })} className="card py-3 text-center font-semibold hover:ring-2 hover:ring-brand/40">{t}</Link>)}
                  </div>
                )}
              </>
            )}

            {step === 4 && service && pro && time && (
              <form action={publicBookAction} className="card space-y-3">
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="serviceId" value={service.id} />
                <input type="hidden" name="professionalId" value={pro.id} />
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="time" value={time} />
                <div className="rounded-xl bg-mist px-3 py-2 text-sm"><b>{service.name}</b> com {pro.nickname ?? pro.name}<br />{date.split("-").reverse().join("/")} às {time} · {service.durationMin} min · {toCents(service.price) > 0 ? `${formatBRL(toCents(service.price))}` : ""}</div>
                {sp.erro && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{sp.erro}</p>}
                <div><label className="label" htmlFor="name">Seu nome</label><input id="name" name="name" required className="field" /></div>
                <div><label className="label" htmlFor="phone">Seu WhatsApp</label><input id="phone" name="phone" required inputMode="tel" className="field" placeholder="(51) 99999-9999" /></div>
                <div><label className="label" htmlFor="notes">Alguma observação?</label><input id="notes" name="notes" className="field" /></div>
                <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" name="optIn" className="mt-0.5 h-4 w-4 accent-brand" /> Quero receber novidades e promoções do salão pelo WhatsApp (os avisos do meu horário chegam de qualquer jeito).</label>
                <button className="btn btn-primary w-full">Pedir horário</button>
                <p className="text-center text-xs text-muted">Você recebe a confirmação pelo WhatsApp {salon.whatsapp ? formatPhone(salon.whatsapp) : ""}.</p>
              </form>
            )}
          </>
        )}
        <footer className="mt-8 text-center text-xs text-muted">
          <PoweredBy label="agendamento por" />
        </footer>
      </div>
      {aiOn && <ReceptionistChat endpoint={`/api/recepcionista/${slug}`} slug={slug} name={salon.aiName?.trim() || "Bia"} salonName={salon.salonName} />}
    </main>
  );
}
