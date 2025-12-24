# ============================================
# Base stage with Node.js and Claude Code CLI
# ============================================
FROM node:20-alpine AS base

# Install dependencies for Claude Code CLI
RUN apk add --no-cache \
    bash \
    git \
    curl \
    python3 \
    make \
    g++

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies
RUN npm ci

# ============================================
# Builder stage
# ============================================
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Set up standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma generated files
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create directories for data and workspace
RUN mkdir -p /app/data /app/workspace /root/.claude
RUN chown -R nextjs:nodejs /app/data /app/workspace

# Use root user to access Claude CLI authentication
# In production, you might want to handle this differently
USER root

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Database URL for SQLite
ENV DATABASE_URL="file:/app/data/claude-code-webui.db"

# Start the application
CMD ["node", "server.js"]
