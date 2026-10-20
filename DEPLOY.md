# Colocar o gradeo beauty no ar (Vercel + Neon) — ~10 minutos, tudo pelo navegador

Mesmo roteiro do gradeo escola. Time **gradeo** na Vercel.

## Caminho recomendado: GitHub → Vercel (deploy automático a cada alteração)
1. github.com (conta **Cobrei**) → **New repository** → nome `gradeo-beauty`, privado → Create.
2. Suba a pasta deste projeto (sem `node_modules` e sem `.next`): na página do repositório vazio, **uploading an existing file** → arraste todo o conteúdo da pasta → Commit.
   - Ou, se tiver o GitHub Desktop: *Add local repository* → esta pasta → Publish.
3. vercel.com → time **gradeo** → **Add New → Project** → **Import** `Cobrei/gradeo-beauty`.
   - Nome do projeto: `gradeo-beauty`. Framework: Next.js (detecta). Não mude o build: o `vercel.json` já define `node scripts/vercel-build.mjs` e a região `gru1` (São Paulo).
   - Em **Environment Variables** adicione agora: `NEXT_PUBLIC_APP_HOST` = `gradeo-beauty.vercel.app` (troque depois pelo domínio final) e `CRON_SECRET` = uma senha longa qualquer.
   - **Deploy**. O primeiro build compila sem banco e avisa "DATABASE_URL ausente" — é esperado.

## Banco de dados
4. Time **gradeo** → **Storage** → **Create Database** → **Neon** → plano Free, região **São Paulo** (ou a mais próxima) → nome `gradeo-beauty-db` → Create.
5. Nesse banco → **Connect Project** → `gradeo-beauty` → todos os ambientes → Connect. Isso cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` sozinho.
6. Projeto `gradeo-beauty` → **Deployments** → último deploy → **⋯ → Redeploy**. Nesse build rodam as migrações (35 tabelas, RLS, triggers) e o seed do salão de demonstração.

## Entrar
- URL: `https://gradeo-beauty-<algo>.vercel.app` (aparece no projeto).
- **Salão demo** (48 clientes, 6 meses de histórico, agenda de hoje):

| Perfil | E-mail | Senha |
|---|---|---|
| Dona | dona@salao.demo | gradeo123 |
| Recepção | recepcao@salao.demo | gradeo123 |
| Profissional | julia@salao.demo | gradeo123 |

- **Salão novo (cadastro real)**: `/cadastro` — 3 passos, entra direto no painel.
- **Agendamento público do demo**: `/agendar/studio-bela`.

## Depois
- Domínio: projeto → **Settings → Domains** → `beauty.gradeo.com.br` (CNAME na Locaweb para `cname.vercel-dns.com`). Atualize `NEXT_PUBLIC_APP_HOST` para `beauty.gradeo.com.br` (ele entra nos links das mensagens).
- Desligar o seed de demonstração em produção: variável `SEED_DEMO=false`.
- Automações: o cron do `vercel.json` chama `/api/jobs/automations` de hora em hora (lembretes, pós-atendimento, retorno, aniversário). No plano Hobby a Vercel limita crons a 1×/dia — se ficar nesse plano, a dona usa o botão "Gerar mensagens de hoje" na Fila de envio, ou suba para o plano Pro.
- WhatsApp automático (opcional): crie o app na Meta (WhatsApp Business Platform), adicione `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_ID` nas variáveis e mude o modo em Configurações → Envio de mensagens. Sem isso, tudo funciona no modo **manual** (um toque abre o WhatsApp com a mensagem pronta).

## Alternativa sem GitHub (arrastar a pasta)
Add New → Project → arraste a pasta (sem node_modules/.next). Funciona, mas cada atualização exige arrastar de novo.

## Se der erro
- Build falhou em `db:migrate`: o banco não está conectado (passo 5) → conecte e Redeploy.
- "seed já aplicado": normal.
- Para zerar o demo: Neon → **Reset** no banco → Redeploy (ou variável `RESET_DEMO=1` num deploy único).
