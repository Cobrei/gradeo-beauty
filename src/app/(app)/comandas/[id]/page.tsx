import { MoneyInput } from "@/components/ui/money-input";
import { appUrl } from "@/lib/app-url";
import Link from "next/link";
import { Badge, Card, Field, Notice, PageHeader, WaLink } from "@/components/ui";
import { Form } from "@/components/ui/form";
import { requireActor } from "@/modules/core/application/auth";
import { getSettings } from "@/modules/core/application/settings";
import { currentCashSession, getOrder } from "@/modules/pos/application/orders";
import { addItemAction, cancelOrderAction, discountAction, payAction, removeItemAction, removeVoucherAction, voucherAction } from "@/modules/pos/ui/actions";
import { listPackages, listProducts, listServices } from "@/modules/catalog/application/use-cases";
import { listProfessionals } from "@/modules/team/application/use-cases";
import { PAYMENT_METHODS } from "@/modules/pos/domain/rules";
import { can } from "@/lib/context";
import { formatBRL, fromCents, toCents } from "@/lib/money";
import { formatBR } from "@/lib/dates";

export const metadata = { title: "Comanda" };

export default async function ComandaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pago?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireActor();
  const [o, settings, services, products, packages, pros, cash] = await Promise.all([getOrder(actor, id), getSettings(actor), listServices(actor), can(actor, "catalog.product.read") ? listProducts(actor) : [], listPackages(actor), listProfessionals(actor), currentCashSession(actor)]);
  const ord = o.order;
  const open = ord.status === "OPEN";
  const total = toCents(ord.total);
  const name = o.clientName ?? ord.walkInName ?? "Cliente";
  const creditServices = new Set(o.credits.map((c) => c.serviceId));
  const receipt = `*${settings.salonName}* · Comanda #${ord.number} · ${formatBR(ord.serviceDate)}\n${o.items.map((i) => `• ${i.item.description} ${Number(i.item.qty) > 1 ? `×${Number(i.item.qty)} ` : ""}${formatBRL(toCents(i.item.total))}`).join("\n")}\n${toCents(ord.discount) + toCents(ord.voucherDiscount) > 0 ? `Descontos: ${formatBRL(toCents(ord.discount) + toCents(ord.voucherDiscount))}\n` : ""}*Total: ${formatBRL(total)}*\nRecibo: ${appUrl(`/recibo/${ord.publicToken}`)}\nObrigada pela visita! 💕`;

  return (
    <div>
      <PageHeader
        title={`Comanda #${ord.number}`}
        subtitle={
          <>
            {ord.clientId ? <Link href={`/clientes/${ord.clientId}`} className="font-semibold text-brand hover:underline">{name}</Link> : name}
            {" · "}{formatBR(ord.serviceDate)}{o.clientVisits === 0 && ord.clientId ? " · primeira visita" : ""}
          </>
        }
        action={
          <>
            <Badge tone={open ? "warn" : ord.status === "PAID" ? "ok" : "mist"}>{open ? "aberta" : ord.status === "PAID" ? "paga" : "cancelada"}</Badge>
            <Link href="/comandas" className="btn btn-secondary btn-sm">← Comandas</Link>
          </>
        }
      />
      {sp.pago && (
        <div className="mb-4">
          <Notice tone="ok">
            Recebido! {o.clientPhone && <WaLink phone={o.clientPhone} text={receipt} className="ml-2 underline">Enviar recibo pelo WhatsApp</WaLink>}
          </Notice>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Itens">
            {o.items.length === 0 ? (
              <p className="text-sm text-muted">Comanda vazia. Adicione serviços ou produtos ao lado.</p>
            ) : (
              <table className="tbl">
                <tbody>
                  {o.items.map(({ item, professionalName }) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-semibold">{item.description}{item.paidWithCreditId && <Badge tone="gold">pacote</Badge>}</div>
                        <div className="text-xs text-muted">{professionalName ?? "—"}{Number(item.qty) !== 1 ? ` · ${Number(item.qty)} × ${formatBRL(toCents(item.unitPrice))}` : ""}{toCents(item.discount) > 0 && !item.paidWithCreditId ? ` · desc. ${formatBRL(toCents(item.discount))}` : ""}</div>
                      </td>
                      <td className="text-right font-semibold">{formatBRL(toCents(item.total))}</td>
                      {open && (
                        <td className="w-10 text-right">
                          <form action={removeItemAction}>
                            <input type="hidden" name="orderId" value={ord.id} />
                            <input type="hidden" name="itemId" value={item.id} />
                            <button className="text-muted hover:text-bad" aria-label="Remover">✕</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(toCents(ord.subtotal))}</span></div>
              {toCents(ord.discount) > 0 && <div className="flex justify-between text-ink-2"><span>Desconto {ord.discountReason ? `(${ord.discountReason})` : ""}</span><span>− {formatBRL(toCents(ord.discount))}</span></div>}
              {o.voucher && <div className="flex justify-between text-brand"><span>Voucher {o.voucher.code}</span><span>− {formatBRL(toCents(ord.voucherDiscount))}</span></div>}
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatBRL(total)}</span></div>
            </div>
          </Card>

          {open && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Adicionar serviço">
                <Form action={addItemAction} submitLabel="Adicionar">
                  <input type="hidden" name="orderId" value={ord.id} />
                  <input type="hidden" name="kind" value="SERVICE" />
                  <Field label="Serviço" name="refId">
                    <select id="refId" name="refId" className="field" required>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} · {formatBRL(toCents(s.price))}{creditServices.has(s.id) ? " · tem crédito" : ""}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Profissional" name="professionalId">
                    <select id="professionalId" name="professionalId" className="field" required>
                      {pros.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Preço (vazio = tabela)" name="unitPrice">
                    <MoneyInput name="unitPrice" placeholder="preço da tabela" />
                  </Field>
                  {o.credits.length > 0 && (
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="useCredit" className="h-4 w-4 accent-brand" /> Usar crédito de pacote</label>
                  )}
                </Form>
              </Card>
              <div className="space-y-4">
                {products.length > 0 && (
                  <Card title="Produto">
                    <Form action={addItemAction} submitLabel="Adicionar">
                      <input type="hidden" name="orderId" value={ord.id} />
                      <input type="hidden" name="kind" value="PRODUCT" />
                      <Field label="Produto" name="refIdP">
                        <select id="refIdP" name="refId" className="field" required>
                          {products.filter((p) => p.forSale).map((p) => (
                            <option key={p.id} value={p.id}>{p.name} · {formatBRL(toCents(p.salePrice))} · est. {Number(p.stockQty)}</option>
                          ))}
                        </select>
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Qtd" name="qty"><input id="qty" name="qty" defaultValue="1" inputMode="decimal" className="field" /></Field>
                        <Field label="Vendido por" name="professionalIdP">
                          <select id="professionalIdP" name="professionalId" className="field" defaultValue="">
                            <option value="">—</option>
                            {pros.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </Form>
                  </Card>
                )}
                {packages.length > 0 && ord.clientId && (
                  <Card title="Vender pacote">
                    <Form action={addItemAction} submitLabel="Adicionar pacote">
                      <input type="hidden" name="orderId" value={ord.id} />
                      <input type="hidden" name="kind" value="PACKAGE" />
                      <Field label="Pacote" name="refIdK">
                        <select id="refIdK" name="refId" className="field" required>
                          {packages.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} · {formatBRL(toCents(p.price))}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Vendido por" name="professionalIdK">
                        <select id="professionalIdK" name="professionalId" className="field" defaultValue="">
                          <option value="">—</option>
                          {pros.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </Field>
                    </Form>
                  </Card>
                )}
              </div>
            </div>
          )}
          {!open && o.payments.length > 0 && (
            <Card title="Pagamentos">
              <ul className="text-sm">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex justify-between py-1"><span>{PAYMENT_METHODS[p.method]}{p.installments > 1 ? ` ${p.installments}×` : ""}</span><span className="font-semibold">{formatBRL(toCents(p.amount))}</span></li>
                ))}
              </ul>
              {o.clientPhone && <WaLink phone={o.clientPhone} text={receipt} className="btn btn-wa btn-sm mt-3">Enviar recibo</WaLink>}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {open && (
            <>
              <Card title="Receber">
                {!cash && <div className="mb-2"><Notice tone="warn">Caixa fechado: dinheiro não pode ser recebido. <Link href="/caixa" className="underline">Abrir caixa</Link></Notice></div>}
                <Form action={payAction} submitLabel={`Receber ${formatBRL(total)}`}>
                  <input type="hidden" name="orderId" value={ord.id} />
                  <p className="text-xs text-muted">Preencha um ou mais meios. A soma deve dar o total.</p>
                  {Object.entries(PAYMENT_METHODS).map(([k, label], i) => (
                    <div key={k} className="grid grid-cols-5 items-end gap-2">
                      <Field label={label} name={`pay_${k}`} className="col-span-3">
                        <MoneyInput id={`pay_${k}`} name={`pay_${k}`} defaultValue={i === 0 ? total / 100 : null} />
                      </Field>
                      {k === "CREDIT" ? (
                        <Field label="Parcelas" name={`inst_${k}`} className="col-span-2">
                          <input id={`inst_${k}`} name={`inst_${k}`} type="number" min={1} max={12} defaultValue={1} className="field" />
                        </Field>
                      ) : (
                        <div className="col-span-2" />
                      )}
                    </div>
                  ))}
                </Form>
              </Card>
              {can(actor, "mkt.voucher.redeem") && (
                <Card title="Voucher">
                  {o.activeVouchers.length > 0 && !o.voucher && (
                    <p className="mb-2 text-xs text-ink-2">Esta cliente tem voucher ativo: {o.activeVouchers.map((v) => <code key={v.id} className="rounded bg-gold-soft px-1">{v.code}</code>)}</p>
                  )}
                  <Form action={voucherAction} submitLabel={o.voucher ? "Trocar" : "Aplicar"}>
                    <input type="hidden" name="orderId" value={ord.id} />
                    <Field label="Código" name="code">
                      <input id="code" name="code" className="field uppercase" defaultValue={o.activeVouchers[0]?.code ?? ""} required />
                    </Field>
                  </Form>
                  {o.voucher && (
                    <form action={removeVoucherAction} className="mt-2">
                      <input type="hidden" name="orderId" value={ord.id} />
                      <button className="text-xs text-muted underline">Remover voucher</button>
                    </form>
                  )}
                </Card>
              )}
              {can(actor, "pos.order.discount") && (
                <Card title="Desconto manual">
                  <Form action={discountAction} submitLabel="Aplicar">
                    <input type="hidden" name="orderId" value={ord.id} />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Valor" name="amount"><MoneyInput name="amount" defaultValue={ord.discount} /></Field>
                      <Field label="Motivo" name="reason"><input id="reason" name="reason" className="field" defaultValue={ord.discountReason ?? ""} /></Field>
                    </div>
                  </Form>
                </Card>
              )}
              {can(actor, "pos.order.cancel") && (
                <Card>
                  <Form action={cancelOrderAction} submitLabel="Cancelar comanda">
                    <input type="hidden" name="orderId" value={ord.id} />
                    <Field label="Motivo" name="reason"><input id="reasonC" name="reason" className="field" required /></Field>
                  </Form>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
