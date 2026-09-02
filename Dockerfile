# ------------------------------------------------------------------
# Eclésia IDB - Frontend (Next.js Pages Router + React + Mantine)
# Build de produção com saída "standalone" (menor imagem de runtime).
# ------------------------------------------------------------------

# --- Estágio 1: dependências + build --------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copia apenas os manifests para aproveitar o cache do npm
COPY package.json package-lock.json ./
RUN npm ci

# Copia o restante do código
COPY . .

# NEXT_PUBLIC_* são embutidas (inlined) em tempo de build.
# Permite sobrescrever a URL da API sem alterar o código.
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

RUN npm run build

# --- Estágio 2: runtime (apenas o necessário) ------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Usuário non-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copia a saída standalone gerada pelo build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
