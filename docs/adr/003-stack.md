# ADR-003: Stack
Data: 2026-10-18 | Status: aceito

## Contexto
Requisitos do dono: (1) rápido de carregar — educador usa no celular, na sala, com 4G ruim; (2) sem retrabalho; (3) manutenção por um time pequeno (Esquadrão) e, futuramente, por desenvolvedores comuns do mercado brasileiro. Já existe conta Vercel conectada.

## Opções
| | TypeScript full-stack (Next.js + Drizzle + Postgres) | Python (Django) + React SPA | Go API + React SPA |
|---|---|---|---|
| Carregamento | SSR + streaming, JS mínimo por rota | SPA pesada ou templates server | SPA pesada |
| Um só código/linguagem | sim | não | não |
| Mercado de devs BR | grande | grande | menor |
| Deploy | Vercel em minutos | VPS/containers | containers |

## Decisão
- **Linguagem:** TypeScript em tudo (domínio, API, UI). Um único vocabulário, tipos compartilhados, menos bugs de contrato.
- **Framework:** Next.js (App Router, React Server Components). Páginas renderizadas no servidor; componentes de cliente só onde há interação.
- **Banco:** PostgreSQL 16. **ORM:** Drizzle (SQL explícito, migrations versionadas, tipos gerados).
- **Validação:** Zod em 3 camadas (entrada, domínio, banco com constraints).
- **UI:** Tailwind CSS + componentes próprios (sem biblioteca pesada); fonte do sistema; ícones SVG inline.
- **Auth:** sessão própria (cookie httpOnly, Argon2id), 2FA por TOTP para direção/financeiro na Fase 4.
- **Testes:** Vitest (domínio e integração com Postgres real) + Playwright (fluxos vitais).
- **Hospedagem:** Vercel (app) + Postgres gerenciado em região brasileira (Neon/Supabase/RDS sa-east-1) [VALIDAR provedor].

## Consequências
+ Primeira tela em produção em dias; HTML chega pronto do servidor.
+ Zero duplicação de regras entre API e tela: casos de uso são chamados por Server Actions tipadas.
− Next.js evolui rápido: fixar versão major e atualizar por ADR.
