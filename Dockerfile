# Use specific version for reproducibility
FROM node:18.19.0-alpine AS base

# Install security updates and required packages once
RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat dumb-init && \
    rm -rf /var/cache/apk/*

# Create user early for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Dependencies stage - optimized for layer caching
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with optimizations
RUN npm ci --only=production --omit=dev --ignore-scripts && \
    npm cache clean --force

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy package files and install ALL dependencies (including dev)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy and generate Prisma client first (better caching)
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Accept and set build arguments
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NODE_ENV=production

ENV DATABASE_URL=$DATABASE_URL \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NODE_ENV=$NODE_ENV \
    NEXT_TELEMETRY_DISABLED=1

# Build application with standalone output
RUN npm run build

# Production stage - ultra-minimal
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Copy built application with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public assets (conditional copy pattern)
COPY --from=builder --chown=nextjs:nodejs /app/public* ./public/ 

# Copy only production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma runtime files
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init for proper signal handling
CMD ["dumb-init", "node", "server.js"]