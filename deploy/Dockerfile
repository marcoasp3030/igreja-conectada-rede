# syntax=docker/dockerfile:1.7
# Multi-stage build para app TanStack Start (Node 20 + SSR)

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json bun.lockb* package-lock.json* pnpm-lock.yaml* yarn.lock* ./
# Usa npm por padrão; ajuste se o projeto usar bun/pnpm
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack prepare pnpm@latest --activate && pnpm i --frozen-lockfile; \
    else npm install; fi

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# apenas artefatos necessários
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
# healthcheck usa curl
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
