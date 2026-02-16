# Multi-stage build for Nest.js application

# Stage 1: Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the Nest.js application
RUN npm run build

# Stage 2: Production stage
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Start the application directly
# Override any ENTRYPOINT from base image by setting it explicitly
ENTRYPOINT ["node"]
CMD ["dist/main.js"]
