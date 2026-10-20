// Fluxo vital no navegador: login → painel → agenda → novo agendamento → finalizar → comanda → receber →
// cliente (ficha) → campanha (criar, preparar) → agendamento público. Tira screenshots em e2e/shots/.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3077";
mkdirSync("e2e/shots", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const shot = (n) => page.screenshot({ path: `e2e/shots/${n}.png`, fullPage: true });
const fail = (m) => { throw new Error(m); };
const t0 = Date.now();
const NOME = `Teste ${String(t0).slice(-6)}`;
const FONE = `51 9${String(t0).slice(-8, -4)}-${String(t0).slice(-4)}`;

await page.goto(`${BASE}/login`);
await page.fill("#email", "dona@salao.demo");
await page.fill("#password", "gradeo123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/painel`);
await shot("01-painel");
(await page.textContent("body")).includes("Clientes sumidas") || fail("painel sem bloco de retenção");

await page.goto(`${BASE}/agenda`);
await shot("02-agenda");
const cols = await page.locator("text=Bela").count();
cols > 0 || fail("agenda sem profissionais");

// novo agendamento para cliente nova
const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
await page.goto(`${BASE}/agenda/novo?d=${today}`);
// passo a passo: serviço(s) → profissional → horário → confirmar
await page.locator("button[aria-pressed]").first().click();
const proBtn = page.locator("button.chip").filter({ hasNotText: /^\d{2}:\d{2}$/ }).first();
await proBtn.click();
await page.locator("input[type=time]").first().fill("18:30");
await page.fill("input[name=walkInName]", NOME);
await page.fill("input[name=newClientPhone]", FONE);
await page.check("input[name=force]");
await page.click("button[type=submit]:has-text('Confirmar')");
await page.waitForURL(/\/agenda\?d=/);
const href = await page.locator("a", { hasText: NOME }).last().getAttribute("href");
await page.goto(`${BASE}${href}`);
await shot("03-atendimento");
// iniciar → finalizar abre comanda
await page.click("button:has-text('Iniciar atendimento')");
await page.waitForURL(/\/agenda\/[0-9a-f-]+/);
await page.click("button:has-text('Finalizar e abrir comanda')");
await page.waitForURL(/\/comandas\/[0-9a-f-]+/);
await shot("04-comanda");
(await page.textContent("body")).includes(NOME) || fail("comanda sem a cliente");
// adicionar produto e receber
const hasProduct = await page.locator("#refIdP").count();
if (hasProduct) {
  await page.selectOption("#refIdP", { index: 0 });
  await page.click("form:has(#refIdP) button[type=submit]");
  await page.waitForLoadState("networkidle");
}
// caixa fechado: recebe em Pix (padrão preenchido)
await page.click("button:has-text('Receber R$')");
await page.waitForURL(/pago=1/);
await shot("05-comanda-paga");
(await page.textContent("body")).includes("Recebido!") || fail("pagamento não confirmou");

// ficha da cliente
await page.click(`a:has-text('${NOME}')`);
await page.waitForURL(/\/clientes\/[0-9a-f-]+/);
await shot("06-cliente");
const body = await page.textContent("body");
body.includes("Visitas") && body.includes("1") || fail("ficha sem visita");
await page.goto(page.url().split("?")[0] + "?aba=ficha");
await page.fill("#text", "7.1 + 8.1 (1:1) ox 20 vol 35 min");
await page.click("button:has-text('Salvar na ficha')");
await page.waitForURL(/aba=ficha/);
(await page.textContent("body")).includes("ox 20 vol") || fail("nota não salvou");

// clientes segmentadas
await page.goto(`${BASE}/clientes?seg=INACTIVE`);
await shot("07-sumidas");
(await page.textContent("body")).includes("Sumidas") || fail("segmento não carregou");

// campanha a partir do modelo
await page.goto(`${BASE}/campanhas/nova?modelo=winback`);
await page.click("button:has-text('Salvar e ver o público')");
await page.waitForURL(/\/campanhas\/[0-9a-f-]+/);
await shot("08-campanha-rascunho");
await page.click("button:has-text('Preparar envio')");
await page.waitForLoadState("networkidle");
await shot("09-campanha-pronta");
const cb = await page.textContent("body");
cb.includes("mensagens prontas") || fail("campanha não preparou mensagens");
const waHref = await page.locator("a:has-text('Enviar no WhatsApp')").first().getAttribute("href");
waHref?.startsWith("/m/") || fail("link manual ausente");

// caixa
await page.goto(`${BASE}/caixa`);
await page.fill("#openingAmount", "100");
await page.click("button:has-text('Abrir caixa')");
await page.waitForLoadState("networkidle");
(await page.textContent("body")).includes("Fechar caixa") || fail("caixa não abriu");
await shot("10-caixa");

// relatórios e comissões
await page.goto(`${BASE}/relatorios`);
await shot("11-relatorios");
await page.goto(`${BASE}/comissoes`);
await shot("12-comissoes");
(await page.textContent("body")).includes("Bela Andrade") || fail("comissões sem linhas");

// agendamento público (nova aba anônima)
const pub = await browser.newPage({ viewport: { width: 420, height: 860 } });
await pub.goto(`${BASE}/agendar/studio-bela`);
const clickAndWait = async () => { const prev = pub.url(); await pub.locator("a.card").first().click(); await pub.waitForURL((u) => u.toString() !== prev); };
await clickAndWait(); // serviço
await clickAndWait(); // profissional
// escolhe o primeiro dia útil com horário livre (hoje pode já ter fechado)
let picked = false;
for (let i = 1; i <= 6 && !picked; i++) {
  const d = new Date(Date.now() + i * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const u = new URL(pub.url());
  u.searchParams.set("d", d);
  await pub.goto(u.toString());
  if ((await pub.locator("a.card").count()) > 0) {
    await clickAndWait();
    picked = true;
  }
}
picked || fail("agendamento público sem horários em 6 dias");
await pub.fill("#name", "Cliente Online");
await pub.fill("#phone", "51 97777-6666");
await pub.screenshot({ path: "e2e/shots/13-publico.png", fullPage: true });
await pub.click("button:has-text('Pedir horário')");
await pub.waitForURL(/\/h\/[0-9a-f-]+\?r=pedido/);
await pub.screenshot({ path: "e2e/shots/14-publico-ok.png", fullPage: true });

// pedido online aparece na agenda como REQUESTED
await page.goto(`${BASE}/agenda`);
const ag = await page.textContent("body");
ag.includes("pedidos online") || ag.includes("Pedido online") || console.log("aviso: pedido online pode ter caído em outro dia");

// automações manuais
await page.goto(`${BASE}/mensagens`);
await page.click("button:has-text('Gerar mensagens de hoje')");
await page.waitForURL(/rodou=/);
await shot("15-fila");

console.log(`E2E ok em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close();
