# Production-ready multi-stage Dockerfile for Next.js (Node 18)
# Builds the app and runs it using 'next start'.

# Stage 1: install dependencies and build
FROM node:22-alpine AS builder

# Install build deps
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package manifests first for caching
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies (use npm if lock not present)
# If yarn.lock exists, only install yarn if it's missing to avoid EEXIST when /usr/local/bin/yarn already exists
RUN if [ -f yarn.lock ]; then \
  if ! command -v yarn >/dev/null 2>&1; then \
    npm i -g yarn; \
  fi && yarn install --frozen-lockfile; \
elif [ -f package-lock.json ]; then \
  npm ci; \
else \
  npm install; \
fi

# Copy the rest of the project
COPY . .

# Build the Next.js app
RUN npm run build

# Stage 2: production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install a small runtime dependency (optional)
RUN apk add --no-cache bash

# Copy only what's needed from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

# Use a non-root user for security
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
USER nextjs

CMD ["npm", "run", "start"]
