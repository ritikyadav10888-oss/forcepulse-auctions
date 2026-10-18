# Force Pulse in one container: Next.js app + API + Socket.IO. Database and photos live in the /data volume.
# Built and run by docker-compose.yml (see deploy/README.md).

# ---------- Build ----------
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/
RUN npm ci

COPY . .
# Keeps the build inside small machines' memory
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536
RUN npm run build \
 && npm prune --omit=dev \
 && rm -rf .next/cache

# ---------- Run ----------
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates sqlite3 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    DATABASE_URL=file:/data/forcepulse.db \
    UPLOAD_DIR=/data/uploads

COPY --from=build /app/package.json /app/server.js /app/next.config.mjs ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/lib ./lib
COPY --from=build /app/src/config ./src/config
COPY --from=build /app/prisma/schema.prisma ./prisma/
COPY deploy/docker-entrypoint.sh /usr/local/bin/forcepulse-start

VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["sh", "/usr/local/bin/forcepulse-start"]
