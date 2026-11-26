# Relatórios agregados de membros

## Objetivo
Substituir o cálculo de relatórios feito inteiramente no navegador por um endpoint backend agregado, com contadores por seção e drilldowns paginados.

## Contexto atual
- `frontend/src/pages/members-reports.tsx:943-955` carrega todos os membros com `accountsApi.members()` e calcula tudo no cliente.
- `apply_member_filters()` em `backend/accounts/viewsets.py:736-821` já centraliza os filtros de membros.
- Padrões de agregação existentes:
  - `GrowthGroupViewSet.stats` em `backend/accounts/viewsets.py:1651-1696`;
  - `PastoralVisitViewSet.summary` em `:3697-3728`;
  - `dashboard_summary` em `backend/finance/services.py:297-338`.
- Dados úteis: `Member` (`models.py:390-630`), `member_analysis()` (`services.py:2109-2157`), SLA (`services.py:868-936`), `GrowthGroupMembership`, EBD, `MemberSubmission` e `PastoralVisit`.
- Relatórios/perf observações em `RELATORIO_AUDITORIA_ENDPOINTS.md` e `RELATORIO_PERFORMANCE_FINAL.md`.

## Decisões
- Endpoint principal: `GET /api/accounts/member-reports/summary/`.
- Parâmetro `sections=` com lista separada por vírgula.
- Ordem de implementação escolhida:
  1. qualidade + acolhimento;
  2. discipulado + engajamento;
  3. geografia;
  4. submissões + visitação.
- Summary devolve contadores e distribuições; não devolve telefone, e-mail, coordenadas individuais nem nomes de membros.
- Listas grandes ficam em drilldowns já existentes ou paginados.
- Reutilizar `apply_member_filters()`.
- Manter compatibilidade com `/members-reports` enquanto a migração acontece.

## Escopo

### Backend
- Nova `APIView` ou `@action(detail=False)` em `accounts`.
- Validar `sections`, `year`, `month` e filtros.
- Payload sugerido:
  - `generated_at`, `church`, `filters`, `totals`;
  - `sections.composition`;
  - `sections.quality` (inclui `missing_fields`, duplicatas, órfãos);
  - `sections.welcome` (SLA verde/amarelo/vermelho, média/máx de espera);
  - `sections.discipleship`;
  - `sections.geography`;
  - `sections.engagement` (GC/EBD);
  - `sections.submissions`;
  - `sections.visitation`;
  - `drilldowns` com URLs dos detalhes.
- Usar `values().annotate()`/`Count(..., filter=Q(...))`.
- Evitar `MemberSerializer` e `get_analysis()` por linha.
- Índices a considerar:
  - `MemberSubmission(church, status, created_at)`;
  - `GrowthGroupMembership(member, status)`.

### Frontend
- `accountsApi.memberReportsSummary(params)` em `src/api/accounts.ts`.
- Tipos em `src/types/index.ts`.
- `members-reports.tsx` carrega summary e busca drilldowns sob demanda.
- Substituir filtro client-side de aniversariantes por `/birthdays/?month=&status=`.
- CSV: mover para backend se for mantido; evitar depender de todos os membros no cliente.
- Preservar abas atuais e deep link `?tab=`.

## Fora de escopo
- Reescrever PDF do rol.
- Novo sistema de permissões.
- Incluir PII no summary.
- Alterar `/members` principal.

## Riscos
- `GrowthGroupViewSet.stats` é O(n²) por pares de coordenadas; não copiar esse padrão.
- `SundaySchoolMonthlyReport` é pesado; usar apenas em drilldown.
- `date__year`/`date__month` devem ser evitados onde der para usar range.
- Contagens precisam excluir membro sentinela.
- Filtros inválidos não podem virar `ValueError`.

## Validação
```bash
cd backend
python manage.py test accounts --verbosity 1
python manage.py check
python manage.py makemigrations --check --dry-run

cd ../frontend
npx tsc --noEmit
npm test
npm run build
```
- Manual: comparar cards com listagens de detalhe; validar filtros e deep links.

## Checklist
- [ ] Endpoint `summary` com `sections=`.
- [ ] Filtros reaproveitando `apply_member_filters()`.
- [ ] Seções na ordem definida implementadas.
- [ ] Drilldowns paginados.
- [ ] Sem PII no payload.
- [ ] Frontend sem baixar todos os membros.
