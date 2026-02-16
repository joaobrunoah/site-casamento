#!/bin/bash

# Test Docker image locally before deploying to Cloud Run
# Usage: ./test-docker-local.sh [admin-user] [admin-password] [--amd64]
# Use --amd64 flag to test with linux/amd64 platform (same as Cloud Run)

set -e

ADMIN_USER=${1:-"admin"}
ADMIN_PASSWORD=${2:-"admin"}
BUILD_AMD64=false

# Check for --amd64 flag
for arg in "$@"; do
    if [ "$arg" = "--amd64" ]; then
        BUILD_AMD64=true
        break
    fi
done

IMAGE_NAME="wedding-api-local"
PORT=8080

echo "🧪 Testing Docker image locally..."
echo "Admin User: $ADMIN_USER"
echo "Admin Password: $ADMIN_PASSWORD"
echo "Port: $PORT"
if [ "$BUILD_AMD64" = true ]; then
    echo "Platform: linux/amd64 (same as Cloud Run)"
else
    echo "Platform: native (faster for local testing)"
fi

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build the Docker image
if [ "$BUILD_AMD64" = true ]; then
    echo "📦 Building Docker image for linux/amd64 (this may take longer)..."
    docker build --platform linux/amd64 -t "$IMAGE_NAME" .
else
    echo "📦 Building Docker image for local testing..."
    docker build -t "$IMAGE_NAME" .
fi

# Stop and remove existing container if it exists
echo "🧹 Cleaning up existing container..."
docker stop "$IMAGE_NAME" 2>/dev/null || true
docker rm "$IMAGE_NAME" 2>/dev/null || true

# Run the container
echo "🚀 Starting container..."
docker run -d \
  --name "$IMAGE_NAME" \
  -p "$PORT:8080" \
  -e ADMIN_USER="$ADMIN_USER" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e NODE_ENV=production \
  -e PORT=8080 \
  "$IMAGE_NAME"

# Wait for the container to start
echo "⏳ Waiting for container to start..."
sleep 5

# Check if container is running
if ! docker ps | grep -q "$IMAGE_NAME"; then
    echo "❌ Container failed to start. Checking logs..."
    docker logs "$IMAGE_NAME"
    exit 1
fi

# Test the health endpoint
echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:$PORT/health || echo "FAILED")

if [[ "$HEALTH_RESPONSE" == *"OK"* ]] || [[ "$HEALTH_RESPONSE" == *"status"* ]]; then
    echo "✅ Health check passed!"
    echo "Response: $HEALTH_RESPONSE"
else
    echo "❌ Health check failed!"
    echo "Response: $HEALTH_RESPONSE"
    echo ""
    echo "Container logs:"
    docker logs "$IMAGE_NAME"
    exit 1
fi

# Test the root endpoint
echo "🏠 Testing root endpoint..."
ROOT_RESPONSE=$(curl -s http://localhost:$PORT/ || echo "FAILED")
echo "Root response: $ROOT_RESPONSE"

echo ""
echo "✅ Local Docker test passed!"
echo "🌐 Server is running at: http://localhost:$PORT"
echo "🏥 Health endpoint: http://localhost:$PORT/health"
echo ""
echo "To stop the container, run: docker stop $IMAGE_NAME && docker rm $IMAGE_NAME"
echo "To view logs, run: docker logs -f $IMAGE_NAME"
