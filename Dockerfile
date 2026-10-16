# Build from source only: Dockerfile.dockerignore excludes all host output/secrets.
FROM node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN test ! -d .next && test ! -e .env && npm run build
RUN npx tsc --noEmit

FROM node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS browser
ARG CHROMIUM_VERSION=155.0.8059.79-1~deb12u1
RUN apt-get update && apt-get install -y --no-install-recommends chromium=${CHROMIUM_VERSION} chromium-sandbox=${CHROMIUM_VERSION} ca-certificates fonts-liberation && rm -rf /var/lib/apt/lists/*

FROM browser AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium HOME=/tmp XDG_CONFIG_HOME=/tmp XDG_CACHE_HOME=/tmp
# drizzle-kit is deliberately retained: npm start reconciles and migrates before next start.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/runtime ./runtime
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/next.config.mjs /app/drizzle.config.ts /app/tsconfig.json ./
USER node
EXPOSE 3000
CMD ["npm", "start"]
