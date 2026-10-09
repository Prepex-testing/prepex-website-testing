# syntax=docker/dockerfile:1
#
# Next.js standalone image. NEXT_PUBLIC_* values are inlined into the browser bundle at BUILD time,
# so they are build args here (the compose file feeds them from /opt/prepex-testing/.env).

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_AUTH_API_URL
ENV NEXT_PUBLIC_AUTH_API_URL=${NEXT_PUBLIC_AUTH_API_URL}
ARG NEXT_PUBLIC_CORE_API_URL
ENV NEXT_PUBLIC_CORE_API_URL=${NEXT_PUBLIC_CORE_API_URL}
ARG NEXT_PUBLIC_DASHBOARD_API_URL
ENV NEXT_PUBLIC_DASHBOARD_API_URL=${NEXT_PUBLIC_DASHBOARD_API_URL}
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=${NEXT_PUBLIC_SENTRY_ENVIRONMENT}
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=4400
# standalone output = server.js + only the node_modules it needs
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 4400
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" > /dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
