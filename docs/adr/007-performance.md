# ADR-007: Performance de carregamento (requisito do dono)
Data: 2026-10-18 | Status: aceito

Metas: primeira pintura < 1,5 s em 4G; interação < 100 ms; tela de turma com 30 crianças carrega em uma viagem ao servidor.
Regras:
1. Renderização no servidor por padrão; `"use client"` só no componente que precisa (formulário, toque na rotina).
2. Orçamento de JavaScript por rota: ≤ 120 kB gzip. Verificado no CI com `next build` + análise de bundle.
3. Sem bibliotecas de UI pesadas, sem moment/lodash; datas com `Intl` e funções próprias; ícones SVG inline.
4. Fonte do sistema (`system-ui`): zero download de fonte.
5. Consultas de listagem sempre paginadas (≤ 50) e com índice composto começando por `tenant_id`; sem N+1 (joins explícitos).
6. Cache HTTP para estáticos; páginas de leitura com `revalidate` curto quando fizer sentido.
7. PWA da sala: shell em cache, dados da turma do dia pré-carregados, escrita em fila local quando offline (Fase 2 do roadmap).
8. Imagens (fotos do diário) redimensionadas no upload (máx. 1600 px, WebP) e servidas por CDN.
