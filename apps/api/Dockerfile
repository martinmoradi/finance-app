# Stage 1: Base setup
FROM node:23-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Install pnpm directly instead of using corepack
RUN npm install -g pnpm
WORKDIR /app

# Stage 2: Prune monorepo
FROM base AS builder
# Install turbo directly with npm instead of pnpm
RUN npm install -g turbo
COPY . .
RUN turbo prune api --docker

# Stage 3: Install production dependencies
FROM base AS prod-deps
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Stage 4: Install all dependencies and build
FROM base AS build
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=api...

# Stage 5: Final production image
FROM base AS runner
# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
USER nestjs

# Copy production dependencies
COPY --from=prod-deps /app/node_modules /app/node_modules
# Copy built application
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json

# Expose port and start application
EXPOSE 3001
CMD [ "node", "apps/api/dist/main.js" ]
