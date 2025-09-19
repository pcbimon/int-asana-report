# Production-ready multi-stage Dockerfile for Next.js (Node 18)
# Builds the app and runs it using 'next start'.

# Stage 1: install dependencies and build
FROM node:lts-bookworm-slim AS builder

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
  npm ci --legacy-peer-deps; \
else \
  npm install --legacy-peer-deps; \
fi
# ...existing code...
RUN if [ -f package-lock.json ]; then \
  npm ci --omit=dev --production --legacy-peer-deps; \
else \
  npm install --production --no-audit --no-fund --legacy-peer-deps; \
fi

# Copy the rest of the project
COPY . .

# Build the Next.js app
RUN npm run build

# Stage 2: production image
FROM node:lts-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production


# Copy only build artifacts and package manifests from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Install only production dependencies in the final image to keep it small
RUN if [ -f package-lock.json ]; then \
  npm ci --omit=dev --production; \
else \
  npm install --production --no-audit --no-fund; \
fi

EXPOSE 3000

# Use a non-root user for security
RUN addgroup --system nextjs && adduser --system --ingroup nextjs --home /app --no-create-home --shell /usr/sbin/nologin nextjs || true
USER nextjs

CMD ["npm", "run", "start"]
