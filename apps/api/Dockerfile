# Build stage - Railway cache bust v3
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build packages and API from workspace root
RUN pnpm --filter @repo/db build
RUN pnpm --filter @repo/ai build
RUN pnpm --filter api build

# Debug: Check if dist folder was created
RUN echo "=== Checking dist folder ===" && find /app/apps/api/dist -name "*.js" | head -20 || echo "No JS files found"

# Production stage
FROM node:20-alpine AS runner

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy all packages (needed for workspace dependencies)
COPY --from=builder /app/packages ./packages

# Copy API source and built files
COPY --from=builder /app/apps/api ./apps/api

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Set working directory to API
WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/apps/api/src/main.js"]
