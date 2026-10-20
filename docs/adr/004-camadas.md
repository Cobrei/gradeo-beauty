# ADR-004: Camadas por módulo
Data: 2026-10-18 | Status: aceito

```
src/modules/<modulo>/
  domain/          entidades, value objects, regras puras, eventos — sem framework, sem banco
  application/     casos de uso (um arquivo por caso de uso), autorização, transação
  infrastructure/  repositórios Drizzle, adaptadores externos
  ui/              componentes e páginas (React), formulários, Server Actions que chamam application/
  index.ts         interface pública do módulo (o que outros módulos podem usar)
```
Dependência só aponta para dentro: ui → application → domain. `infrastructure` implementa interfaces declaradas em `application`/`domain`.
Módulos: `core` (tenant, unidades, usuários, papéis, auditoria), `people` (pessoas, famílias, funcionários), `children` (crianças, saúde, autorizados), `enrollment` (planos, turmas, matrículas, contratos, parcelas), `diary` (diário e rotina), `family` (app da família), `finance`, `accounting`, `hr`.
