FROM node:22-alpine

# Install pnpm via corepack (avoids npm_config_user_agent mismatch)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy full monorepo (needed to resolve workspace:* packages)
COPY . .

# Install dependencies — skip lifecycle scripts to avoid preinstall guard,
# then rebuild native binaries (esbuild, etc.)
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild

# Build the api-server (esbuild bundles workspace packages into dist/)
RUN pnpm --filter @workspace/api-server run build

# Move into the api-server directory to run
WORKDIR /app/artifacts/api-server

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
