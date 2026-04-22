# syntax=docker/dockerfile:1.6

############################
# 1. deps
############################
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY .env.example ./.env.example
COPY prisma ./prisma
COPY scripts/ensure-env.cjs ./scripts/ensure-env.cjs
# Use `npm ci` when a lockfile exists, fall back to `npm install` otherwise so
# the first build can bootstrap without a committed lockfile.
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

############################
# 2. builder
############################
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

############################
# 3. runtime
############################
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl tini \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone output + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema + client + CLI for migrations at container start
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh \
    && chmod +x /entrypoint.sh \
    && mkdir -p /app/storage \
    && chown -R nextjs:nodejs /app/storage /app/.next /app/node_modules /app/prisma /app/scripts

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/entrypoint.sh"]

# Fail fast if the app doesn't answer; health-checked by the orchestrator.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
