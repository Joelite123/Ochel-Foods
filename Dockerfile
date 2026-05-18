FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy full monorepo (needed to resolve workspace:* packages)
COPY . .

# Install all workspace dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Build the api-server (esbuild bundles workspace packages into dist/)
RUN pnpm --filter @workspace/api-server run build

# Move into the api-server directory to run
WORKDIR /app/artifacts/api-server

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
