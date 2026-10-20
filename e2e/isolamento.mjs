// Isolamento entre salões: cria um salão novo e confere que ele NÃO enxerga nada do salão demo.
// Uso: BASE=http://localhost:3077 node e2e/isolamento.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3077";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const fail = (m) => { throw new Error("VAZAMENTO/FALHA: " + m); };
const id = String(Date.now()).slice(-7);

await page.goto(`${BASE}/cadastro`);
await page.fill("#salonName", `Salão Isolado ${id}`);
await page.click("button:has-text('Continuar'), section:not(.hidden) button.btn-primary");
await page.locator("section:not(.hidden) button.btn-primary").first().click();
await page.fill("#ownerName", "Dona Isolada");
await page.fill("#phone", `51 9${id.slice(0, 4)}-${id.slice(3, 7)}`);
await page.fill("#email", `iso${id}@teste.local`);
await page.fill("#password", `iso-${id}-senha`);
await page.click("button[type=submit]");
await page.waitForURL(/\/painel/);

const body = async (path) => { await page.goto(`${BASE}${path}`); return (await page.textContent("main")) ?? ""; };

const clientes = await body("/clientes");
for (const nome of ["Raquel Silva", "Cristiane Freitas", "Cliente Online"]) if (clientes.includes(nome)) fail(`cliente do demo visível: ${nome}`);
const painel = await body("/painel");
if (painel.includes("Studio Bela")) fail("painel mostra o salão demo");
const servicos = await body("/servicos");
const comandas = await body("/comandas");
if (/#\s?2\d\d/.test(comandas)) fail("comandas do demo visíveis");
const equipe = await body("/equipe");
for (const nome of ["Bela Andrade", "Júlia Mendes", "Renata Lopes"]) if (equipe.includes(nome)) fail(`profissional do demo visível: ${nome}`);
const caixa = await body("/caixa");
if (!(await page.locator("#openingAmount").count())) fail("caixa de outro salão bloqueia a abertura");

console.log(`Isolamento ok (salão de teste iso${id}@teste.local)`);
await browser.close();
