FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/db ./packages/db
COPY apps/api ./apps/api
RUN npm install
RUN npm run db:generate
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 apiuser
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/lib/models ./apps/api/dist/lib/models
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
RUN mkdir -p /app/apps/api/public/uploads && chown -R apiuser:nodejs /app
WORKDIR /app/apps/api
USER apiuser
EXPOSE 4000
CMD ["node", "dist/index.js"]

