# Pipeline Engine Dockerfile
# Full pipeline orchestration service

FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Set environment variables
ENV NODE_ENV=production

# Expose port (if needed for health checks)
EXPOSE 3000

# Run pipeline orchestrator
# This will be overridden by ECS task definition
CMD ["node", "--loader", "tsx/esm", "src/engine/orchestrator.ts"]

