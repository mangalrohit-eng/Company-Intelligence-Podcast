# Single Container for Everything
# Next.js + API + Pipeline Orchestrator + All Stages

# Use AWS ECR Public Gallery to avoid Docker Hub rate limits
# Alternative: Use public.ecr.aws if the docker/library path doesn't work
FROM public.ecr.aws/docker/library/node:18-slim

# Install Playwright dependencies (for scraper)
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./

# Copy config files (if they exist)
COPY next.config.* ./
COPY tailwind.config.* ./
COPY postcss.config.* ./

# Install dependencies
RUN npm ci

# Copy all source code
COPY src/ ./src/
COPY containers/ ./containers/
COPY scripts/ ./scripts/

# Create public directory (required by Next.js)
# Note: public directory should be included in source.zip by prepare script
RUN mkdir -p ./public

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Build Next.js application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js server
CMD ["npm", "start"]

