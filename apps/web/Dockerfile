# Stage 1: Base setup
FROM node:23-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm
WORKDIR /app

# Stage 2: Prune monorepo
FROM base AS builder
RUN npm install -g turbo
COPY . .
RUN turbo prune web --docker

# Stage 3: Install dependencies and build
FROM base AS installer
# Install dependencies needed for Next.js build
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and lockfile
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
# Add debugging to see what's being built
RUN ls -la
RUN pnpm turbo run build --filter=web...
# Add debugging to see the build output
RUN ls -la apps/web/.next/

# Stage 4: Production runner
FROM base AS runner
# Install required system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set the correct permission for nextjs
RUN mkdir -p /app/.next
RUN chown nextjs:nodejs /app/.next

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static /app/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public /app/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Set environment variables
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
