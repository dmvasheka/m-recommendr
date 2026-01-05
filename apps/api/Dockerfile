# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build packages first
RUN cd /app/packages/db && pnpm build || echo "db build failed or no build script"
RUN cd /app/packages/ai && pnpm build || echo "ai build failed or no build script"

# Build API directly with nest build
RUN cd /app/apps/api && pnpm build

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
