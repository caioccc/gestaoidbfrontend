# Eclésia IDB — Frontend

Interface web do **Eclésia IDB**, sistema de gestão financeira das Igrejas de Deus no Brasil.
Desenvolvida com Next.js (Pages Router), React, Mantine UI e TypeScript.

## Stack

- **Next.js 16** (Pages Router, Turbopack) + **React 19**
- **Mantine** (v7/*~9.5.2*) — componentes e sistema de tema (claro/escuro)
- **@mantine/datatable** — tabelas de lançamentos
- **recharts** — gráficos do dashboard e da DRE
- **axios** — cliente HTTP para a API (base em `src/api`)
- **dayjs** — datas e períodos
- **react-imask** — máscaras (CPF, telefone, etc.)
- **leaflet** — mapas (localização das congregações)
- **xlsx** — importação de planilhas
- **js-cookie** — persistência do token JWT
- **i18n próprio** — pt-BR / en / es (`src/i18n`)

## Estrutura

```
src/
├── api/          # clientes de API: accounts, finance, adminFinance
├── components/   # UI reutilizável + painéis (treasurer/admin/approve)
│   └── admin/sections/  # 10 seções reutilizadas no painel admin por igreja
├── contexts/     # AuthContext, ThemeContext, etc.
├── hooks/        # hooks customizados (tabelas, paginação)
├── i18n/         # traduções pt/en/es + formatters
├── pages/        # rotas (Pages Router)
│   ├── admin/churches/            # painel nacional (admin)
│   └── admin/churches/[churchId]/ # app completo por igreja
├── types/        # tipos TypeScript (domínio + API)
└── utils/        # utilitários
```

## Como rodar (desenvolvimento)

Pré-requisitos: Node.js 20+ e o backend Django rodando (veja o README da raiz).

```bash
npm install
npm run dev
```

A aplicação roda em `http://localhost:3000` por padrão.

## Scripts

| Comando            | Descrição                                  |
|--------------------|---------------------------------------------|
| `npm run dev`      | Servidor de desenvolvimento                |
| `npm run build`    | Build de produção (`next build`)           |
| `npm run start`    | Serve o build de produção (`next start`)   |
| `npx tsc --noEmit` | Verificação de tipos (TypeScript)          |

## Variáveis de ambiente

| Variável                | Uso                                                        |
|-------------------------|------------------------------------------------------------|
| `NEXT_PUBLIC_BASE_URL`  | URL base da API Django (ex.: `http://localhost:8000/api`). **Embutida no JavaScript em tempo de build** — defina antes de `next build`. |

Crie um arquivo `.env.local`:

```
NEXT_PUBLIC_BASE_URL=http://localhost:8000/api
```

## Rotas principais

### Tesoureiro (aplicação por congregação)
Rotas planas no layout autenticado — dashboard, importação, entradas/saídas, dízimos, fechamentos, relatórios, DRE, extrato, calendário e perfil.

### Administração nacional
- `/admin/churches` — grade de cards de **todas** as congregações (pendentes, ativas, rejeitadas), com aprovação/rejeição.
- `/admin/churches/[churchId]/[section]` — acesso **completo** (CRUD + importação) do app da igreja, recriado via rotas aninhadas; cada seção usa a mesma API administrativa por igreja.

## Login / Permissões

- **Tesoureiro**: usuário com `church` vinculada; acesso às finanças da própria igreja.
- **Administrador**: conta `is_staff` sem igreja (`church=None`); acesso nacional a todas as igrejas.

## Docker

Siga o `Dockerfile` da raiz do frontend (saída `standalone`) ou a documentação na raiz do
repositório para rodar a stack completa com `docker compose`.

## Internacionalização

As traduções ficam em `src/i18n/translations.ts` (blocos `pt`, `en`, `es`). Para adicionar texto,
insira a chave nos três idiomas e use o helper de tradução do `src/i18n`.
