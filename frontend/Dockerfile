FROM node:22-alpine AS dependencies
WORKDIR /app
RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY frontend/ ./
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 swarf && adduser --system --uid 1001 swarf
COPY --from=build --chown=swarf:swarf /app/public ./public
COPY --from=build --chown=swarf:swarf /app/.next/standalone ./
COPY --from=build --chown=swarf:swarf /app/.next/static ./.next/static
EXPOSE 3000
USER swarf
CMD ["node", "server.js"]
