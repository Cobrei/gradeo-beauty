# ADR-001: Monolito modular
Data: 2026-10-18 | Status: aceito

## Contexto
Ciranda é um sistema de gestão para escolas de educação infantil (60–250 crianças por escola), vendido como SaaS depois de um piloto. Time de construção: Esquadrão ERP (Claude) com validação semanal do dono do produto. A complexidade mora no domínio (matrícula, rotina, saúde, financeiro), não na infraestrutura.

## Opções
1. Monolito modular — um deploy, módulos com fronteiras rígidas em código.
2. Monolito + serviços satélite (fiscal, cobrança).
3. Microserviços.

## Decisão
Opção 1. Um único aplicativo, organizado em `src/modules/<nome>/{domain,application,infrastructure,ui}`. Módulo só importa a interface pública (`index.ts`) de outro módulo. Serviços externos (boleto/PIX, NFS-e, assinatura) são adaptadores em `infrastructure/`, nunca lógica.

## Consequências
+ Um deploy, um banco, transações simples, custo operacional mínimo.
+ Extração de serviço possível no futuro porque as fronteiras já existem.
− Exige disciplina: lint de importação (`eslint-plugin-boundaries`) bloqueia import cruzado.
