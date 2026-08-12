FROM node:22-alpine AS dependencies

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY server/package.json server/package.json

RUN pnpm install --frozen-lockfile --prod --filter @lfw/server...

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV API_PORT=8788

WORKDIR /app

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=dependencies --chown=node:node /app/server/node_modules ./server/node_modules
COPY --chown=node:node package.json pnpm-workspace.yaml ./
COPY --chown=node:node packages/contracts/package.json packages/contracts/package.json
COPY --chown=node:node packages/contracts/src packages/contracts/src
COPY --chown=node:node server/package.json server/package.json
COPY --chown=node:node server/drizzle server/drizzle
COPY --chown=node:node server/src server/src

USER node

EXPOSE 8788

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O - http://127.0.0.1:8788/health/live >/dev/null || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "--experimental-strip-types", "server/src/index.ts"]

