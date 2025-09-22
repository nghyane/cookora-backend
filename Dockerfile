# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application (bundles everything into single file)
# Add --sourcemap for better error traces in production
RUN bun build src/index.ts --outdir=dist --target=bun --sourcemap

# Runtime stage
FROM oven/bun:latest

WORKDIR /app

# Only copy the bundled output
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Run application
CMD ["bun", "run", "dist/index.js", "--host", "0.0.0.0"]
