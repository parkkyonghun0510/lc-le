# Use the official Node.js image as the base image
FROM node:20-alpine AS deps
# Install dependencies only when needed
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./
# Install ALL dependencies (including dev) so build stage has TypeScript available
RUN npm ci --prefer-offline --no-audit --ignore-scripts && npm cache clean --force

# Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies first for better layer caching
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy source code
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Pass through public env vars at build time so Next.js can inline them
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NODE_ENV
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NODE_ENV=${NODE_ENV:-production}

# Build the application with optimizations
RUN echo "Building with NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" && \
    npm run build:railway && \
    # Clean up build artifacts
    npm prune --production && \
    # Remove unnecessary files
    rm -rf .next/cache

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# Disable telemetry during runtime for production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install security updates and required packages
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init curl && \
    # Remove package cache to reduce image size
    rm -rf /var/cache/apk/* && \
    # Remove unnecessary accounts and groups
    rm -f /var/log/*.log /var/log/*/*.log

# Copy the standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set proper ownership and permissions
RUN chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
# Optimize Node.js for production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Use dumb-init for proper signal handling
CMD ["dumb-init", "node", "server.js"]