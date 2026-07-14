# ---- Stage 1: Development ----
FROM node:22-alpine AS development
WORKDIR /usr/src/app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --chown=node:node package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY --chown=node:node . .
USER node

# ---- Stage 2: Build ----
FROM node:22-alpine AS build
WORKDIR /usr/src/app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --chown=node:node package.json pnpm-lock.yaml* ./
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .
RUN pnpm run build
RUN pnpm prune --prod

# ---- Stage 3: Production Runtime ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

COPY --chown=appuser:appgroup --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=build /usr/src/app/dist ./dist
COPY --chown=appuser:appgroup package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

USER appuser

CMD ["node", "dist/main.js"]
