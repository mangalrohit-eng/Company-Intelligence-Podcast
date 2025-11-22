# Scraper Service Dockerfile
# Node.js + TypeScript + Playwright for web scraping

FROM node:18-slim

# Install Playwright system dependencies
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

# Install dependencies
RUN npm ci --production

# Copy source code
COPY src/ ./src/

# Build TypeScript (if needed, or use tsx at runtime)
# RUN npm run build

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose port (if needed for health checks)
EXPOSE 3000

# Run scraper entry point
# This will be overridden by ECS task definition
CMD ["node", "--loader", "tsx/esm", "src/engine/stages/scrape.ts"]

