# Features candidatas — Frontend

Índice das propostas levantadas a partir das últimas entregas (mapa de membros, geocode da igreja e perfil).  
Cada feature tem um Markdown próprio nesta raiz com contexto, decisões, escopo e validação.

Atualizado em: 2026-11-26.

## Decisões globais

- Switches de mapa devem ser locais ao componente, sem query params e sem impacto em SEO/sitemap.
- i18n: toda chave nova entra em `pt`, `en` e `es` em `src/i18n/translations.ts`.
- Seguir `AGENTS.md` (Next.js 16 / Pages Router / Turbopack) antes de qualquer alteração.
- Heatmap representa **densidade de residências dos membros**, não presença em culto/EBD.
- Delimitação de cidades deve usar **GeoJSON real**, não círculo aproximado.
- Check-in: modos `PER_DAY` e `ONCE`; criação/gestão restrita a `PASTOR`, `SECRETARIA`, `TESOUREIRO` e `ADMIN`.
- Inscrição pública de GC, novo link no agregador e papel `LIDER_MINISTERIO` ficam **fora desta rodada**.

## Features detalhadas

| Ordem | Feature | Arquivo | Status | Prioridade |
|---:|---|---|---|---|
| 1 | Fronteiras de cidades com GeoJSON | [FEATURE_MAPA_CIDADES_GEOJSON.md](./FEATURE_MAPA_CIDADES_GEOJSON.md) | Planejada | Média |
| 2 | Relatórios agregados de membros | [FEATURE_RELATORIOS_MEMBROS.md](./FEATURE_RELATORIOS_MEMBROS.md) | Planejada | Média |
| 3 | Módulo de check-in de eventos | [FEATURE_CHECKIN_EVENTOS.md](./FEATURE_CHECKIN_EVENTOS.md) | Planejada | Alta |

Concluídas e removidas:
- Heatmap de residências no mapa de membros.
- Tabela administrativa de eventos.
- `Complemento` fora de “Campos pendentes”.
- Rota ida/volta no mapa de membros.
- Overlay de GCs no mapa de membros.

## Backlog / ideias ainda não detalhadas

- Inscrição pública em Grupos de Crescimento (`GrowthGroupSignup`) com revisão interna.
- Novo link de sistema no agregador `/p/[slug]` para inscrição em GC.
- Papel global `LIDER_MINISTERIO` — decidido não criar nesta rodada.
- Líderes delegados por evento — alternative ao papel global; também fora desta rodada.
- Switches de pontos/raio nas páginas internas/públicas de GC — não incluídos aqui; o pedido atual é no mapa de membros.
- Check-in com confirmação autenticada além da página pública por token.
- Integração do link de check-in no agregador público.
- Exportação backend dos relatórios em CSV/XLS, substituindo o CSV client-side atual.

## Convenção para novos arquivos

- Nome: `FEATURE_<NOME>.md`, em maiúsculas, na raiz de `frontend/`.
- Seções recomendadas: **Objetivo**, **Contexto atual**, **Decisões**, **Escopo**, **Fora de escopo**, **Implementação**, **Validação**, **Checklist**.
- Quando uma feature sair do papel, atualizar o status na tabela acima.
