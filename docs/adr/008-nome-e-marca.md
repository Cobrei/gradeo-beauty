# ADR-008: Nome do produto isolado em configuração
Data: 2026-10-18 | Status: aceito (atualizado)

## Decisão
Nome do produto: **Gradeo** (domínio gradeo.com.br já registrado pelo dono em 24/09/2026). "Ciranda" foi descartado por pré-existência de marcas com o mesmo radical. O projeto anterior "Gradeo" (catálogo B2B) deixa de usar o nome.

O nome aparece em um único lugar (`src/config/brand.ts`) e em nenhuma tabela, rota ou identificador. Identificadores internos de banco/cookie permanecem neutros.

## Pendências
- Pesquisa de anterioridade no INPI, classes 9 e 42, para "GRADEO" [VALIDAR].
- Logotipo e paleta final (a paleta atual é provisória).

## Atualização 18/10/2026 — arquitetura de marca e logotipo
- **gradeo** é a empresa de sistemas; produtos: **gradeo mostruário** (vendas de vestuário, B2B) e **gradeo escola** (este sistema).
- gradeo.com.br vira uma home simples com um logotipo clicável por sistema; cada produto tem sua própria entrada (`escola.gradeo.com.br` proposto).
- Logotipo da escola aprovado: **conceito A "Sol dos turnos"** — a palavra "gradeo" em minúsculas nunca muda; o "o" final vira um sol (anel verde-água #2a9d8f, raios mel #e9933a), porque manhã, tarde e integral são os produtos da escola. Implementado em `src/components/ui/logo.tsx` (SVG inline, sem JS); ícone em `src/app/icon.svg`.
- INPI 18/10/2026 (base até 13/10): pesquisa exata "GRADEO" sem resultados; radical traz 5 processos sem relação. Falta a busca por semelhantes nas classes 9 e 42.
