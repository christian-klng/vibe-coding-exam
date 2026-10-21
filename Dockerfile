# Production image for Coolify (or any Docker host).
# Build: docker build -t vibe-coding-exam .
# Run:   docker run -p 3000:3000 --env-file .env.production vibe-coding-exam

FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- Build: all dependencies, then next build (output: "standalone") ---
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime: only the standalone server and the files read at runtime ---
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Task definitions and database migrations are read from disk at runtime.
COPY --from=build --chown=node:node /app/tasks ./tasks
COPY --from=build --chown=node:node /app/drizzle ./drizzle
# The migration script needs the complete packages, not just the files the server uses.
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build --chown=node:node /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=node:node /app/node_modules/postgres ./node_modules/postgres

USER node
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# Coolify uses this instead of its own curl-based check, so the image needs no curl.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Apply pending migrations, then start the server.
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]
