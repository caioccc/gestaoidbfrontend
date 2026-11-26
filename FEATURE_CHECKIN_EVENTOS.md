# Módulo de check-in de eventos

## Objetivo
Criar um módulo de eventos com check-in configurável, suportando eventos de um ou vários dias e uma página pública de validação com scanner de QR Code e digitação manual do código.

## Contexto atual
- `finance.CalendarEvent` em `backend/finance/models.py:158-279` já tem título, categoria, horários, audiência, membros e recorrência.
- Expansão de recorrência no backend em `backend/boletim/services.py:22-71` e no frontend em `frontend/src/utils/calendarRecurrence.ts`.
- `Member.user` em `backend/accounts/models.py:573-581`; `qr_hash`/`public_hash` em `:524-538`.
- `resolve_qr_code()` em `backend/accounts/services.py:397-431` aceita URL/código e normaliza uppercase.
- Endpoint público atual de QR devolve dados demais; **não reutilizar** seu serializer.
- `MemberInvite` em `backend/accounts/models.py:1452-1550` é referência de token público, validade, usos e regeneração.
- `@zxing/browser` já está em `frontend/package.json`.
- Rotas públicas em `frontend/src/pages/_app.tsx:85-96`; `robots.ts` e `sitemap.ts` controlam indexação.

## Decisões
- Suportar **ambos os modos**:
  - `PER_DAY`: uma `EventSession` por data do evento; check-in separado em cada dia.
  - `ONCE`: uma única sessão para o evento, mesmo multidiário.
- Criação/gestão restrita a `PASTOR`, `SECRETARIA`, `TESOUREIRO` e ADMIN.
- Não criar papel global `LIDER_MINISTERIO` nesta rodada.
- Não usar líderes delegados por evento nesta rodada.
- Página pública: `/check-in/[token]` com:
  - metadados mínimos do evento/sessão;
  - scanner QR Code;
  - campo para digitar o código manualmente.
- Token por sessão, regenerável e desativável.
- Check-in idempotente por `(session, member)`.
- Novo throttle `public_event_checkin`.
- Página pública com `noindex,nofollow`, fora do sitemap e em `PUBLIC_ROUTES`.

## Escopo

### Backend
- Novo app `events` ou `checkin` com FK para `finance.CalendarEvent`.
- Modelos:
  - `EventCheckinConfig`: `event`, `church`, `mode`, `is_enabled`, janela `opens_at/closes_at`, `created_by`.
  - `EventSession`: `config`, `event_date` opcional, `label`, `token`, `is_active`, `opens_at/closes_at`.
  - `EventCheckin`: `session`, `member`, `checked_in_at`, `source`, `checked_in_by`, `church`.
- Constraints:
  - `unique(config, event_date)` para `PER_DAY`;
  - `unique(session, member)` para check-in.
- Serviço de geração de sessões a partir da expansão de recorrência no backend.
- Viewsets autenticados para config/sessões/presenças, com escopo por igreja.
- `APIView` pública:
  - `GET /api/events/public/checkin/{token}/` → metadados mínimos;
  - `POST /api/events/public/checkin/{token}/` com `{ code }`.
- Serializer público mínimo: nome, número do cartão, igreja, status, data/hora do check-in. Sem CPF, endereço ou telefone.
- Admin Django para os três modelos.
- Throttle em `backend/core/settings.py`.

### Frontend
- Tipos e API clients para config, sessões e check-in público.
- Configuração de check-in integrada em `calendar.tsx` ou `CalendarEventsBoard.tsx`.
- Geração/regeneração de token e listagem de presenças no painel.
- Página `src/pages/check-in/[token].tsx`:
  - `PUBLIC_ROUTES`;
  - `Head` com `noindex,nofollow`;
  - scanner com `@zxing/browser`;
  - input manual com normalização;
  - estados: sessão aberta/fechada/inválida, já registrado, sucesso, erro.
- i18n pt/en/es.
- `robots.ts`: bloquear `/check-in/`.
- `sitemap.ts`: não incluir.

## Fora de escopo
- Novo papel `LIDER_MINISTERIO`.
- Líderes delegados por evento.
- Inscrição pública em GC e agregador `/p/[slug]`.
- Check-in autenticado por “Estou presente”.
- Alteração na agenda pública `/calendario/[hash]`.

## Riscos
- Token é credencial de posse: não logar token completo, permitir regeneração.
- `context` do QR hoje é pass-through; não usar como autorização.
- Validar igreja do membro/sessão no backend.
- Janela de check-in precisa ser validada no servidor.
- Duplo check-in depende de constraint, não só de checagem prévia.
- Não acrescentar contadores de check-in no payload de calendário sem `prefetch`/agregação.

## Validação
```bash
cd backend
python manage.py test events --verbosity 1
python manage.py test finance accounts --verbosity 1
python manage.py check
python manage.py makemigrations --check --dry-run

cd ../frontend
npx tsc --noEmit
npm test
npm run build
```
- Testes backend: `PER_DAY`, `ONCE`, janela aberta/fechada, QR inválido, membro inativo, igreja errada, duplo check-in, regenerate token, permissões, throttle, ausência de PII no payload público, `noindex`.

## Checklist
- [ ] Modelos e migration.
- [ ] Geração de sessões por recorrência.
- [ ] Endpoint público com throttle.
- [ ] Serializer sem PII.
- [ ] Configuração no painel.
- [ ] Página com scanner + código manual.
- [ ] `PUBLIC_ROUTES`, `robots`, `noindex`.
- [ ] i18n pt/en/es.
