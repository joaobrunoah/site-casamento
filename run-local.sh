#!/bin/bash

# Script to run client, Nest.js server, and firestore locally
# This script starts:
# - React development server (port 3000)
# - Nest.js server (port 8080)
# - Firestore emulator (port 8080 - conflicts, so we'll use a different port)
# - Firebase Emulator UI (port 4000)

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    kill $FIRESTORE_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}🚀 Starting local development environment...${NC}\n"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed. Please install it with: npm install -g firebase-tools${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
    cd client
    npm install
    cd ..
fi

if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
    cd server
    npm install
    cd ..
fi

# Load environment variables from server/.env.local if it exists
if [ -f "server/.env.local" ]; then
    echo -e "${BLUE}📋 Loading server/.env.local...${NC}"
    set -a  # Automatically export all variables
    source server/.env.local
    set +a  # Stop automatically exporting
    echo -e "${GREEN}✅ Loaded environment variables from server/.env.local${NC}"
fi

# Load environment variables from server/.env if it exists (lower priority)
if [ -f "server/.env" ]; then
    echo -e "${BLUE}📋 Loading server/.env...${NC}"
    set -a  # Automatically export all variables
    source server/.env
    set +a  # Stop automatically exporting
    echo -e "${GREEN}✅ Loaded environment variables from server/.env${NC}"
fi

# Set environment variables for server (use defaults if not set)
if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  ADMIN_USER and ADMIN_PASSWORD not set.${NC}"
    echo -e "${YELLOW}   Setting default values for local development...${NC}"
    echo -e "${YELLOW}   Create server/.env.local to set custom values:${NC}"
    echo -e "${YELLOW}     ADMIN_USER=your-username${NC}"
    echo -e "${YELLOW}     ADMIN_PASSWORD=your-password${NC}"
    export ADMIN_USER=${ADMIN_USER:-admin}
    export ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
else
    echo -e "${GREEN}✅ Using ADMIN_USER and ADMIN_PASSWORD from environment${NC}"
fi

# Check for client .env.local (React automatically loads it)
if [ -f "client/.env.local" ]; then
    echo -e "${BLUE}📋 Using .env.local from client folder for React app...${NC}"
else
    echo -e "${YELLOW}⚠️  No client/.env.local found. React app will use default environment variables.${NC}"
    echo -e "${YELLOW}   Create client/.env.local to set REACT_APP_* environment variables.${NC}"
fi

# Start Firestore emulator in the background (using port 8081 to avoid conflict with Nest.js on 8080)
echo -e "${BLUE}🔥 Starting Firestore emulator on port 8081...${NC}"
echo -e "${YELLOW}📋 Emulator logs will be saved to: /tmp/firestore-emulator.log${NC}\n"
FIRESTORE_PORT=8081
export FIRESTORE_EMULATOR_HOST="localhost:${FIRESTORE_PORT}"
# Ensure NODE_ENV is not set to production for local development
export NODE_ENV=${NODE_ENV:-development}

firebase emulators:start --only firestore --project demo-project > /tmp/firestore-emulator.log 2>&1 &
FIRESTORE_PID=$!

# Wait for Firestore emulator to be ready
echo -e "${BLUE}⏳ Waiting for Firestore emulator to be ready...${NC}"
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    # Check if process is still running
    if ! kill -0 $FIRESTORE_PID 2>/dev/null; then
        echo -e "${RED}❌ Firestore emulator process died. Check /tmp/firestore-emulator.log for details.${NC}"
        echo -e "${YELLOW}Last 20 lines of log:${NC}"
        tail -20 /tmp/firestore-emulator.log
        exit 1
    fi
    
    # Check if emulator is listening on the port
    # Try lsof first (works on macOS/Linux), then nc as fallback
    if lsof -Pi :$FIRESTORE_PORT -sTCP:LISTEN -t >/dev/null 2>&1 || (command -v nc >/dev/null && nc -z localhost $FIRESTORE_PORT 2>/dev/null); then
        echo -e "${GREEN}✅ Firestore emulator is ready on port ${FIRESTORE_PORT}${NC}"
        break
    fi
    
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $((WAIT_COUNT % 5)) -eq 0 ]; then
        echo -e "${YELLOW}   Still waiting... (${WAIT_COUNT}/${MAX_WAIT}s)${NC}"
    fi
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "${RED}❌ Firestore emulator did not become ready within ${MAX_WAIT} seconds.${NC}"
    echo -e "${YELLOW}Last 20 lines of log:${NC}"
    tail -20 /tmp/firestore-emulator.log
    kill $FIRESTORE_PID 2>/dev/null || true
    exit 1
fi

# Check if port 8080 is already in use and kill the process if needed
SERVER_PORT=8080
if lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port ${SERVER_PORT} is already in use.${NC}"
    OLD_PID=$(lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t | head -1)
    if [ -n "$OLD_PID" ]; then
        echo -e "${YELLOW}   Killing process ${OLD_PID} on port ${SERVER_PORT}...${NC}"
        kill $OLD_PID 2>/dev/null || true
        sleep 2
        # Verify it's been killed
        if lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${RED}❌ Failed to free port ${SERVER_PORT}. Please kill the process manually.${NC}"
            echo -e "${YELLOW}   Run: lsof -i :${SERVER_PORT}${NC}"
            kill $FIRESTORE_PID 2>/dev/null || true
            exit 1
        else
            echo -e "${GREEN}✅ Port ${SERVER_PORT} is now free${NC}"
        fi
    fi
fi

# Start Nest.js server in the background
echo -e "${BLUE}🚀 Starting Nest.js server...${NC}"
echo -e "${BLUE}📋 Environment variables being passed:${NC}"
echo -e "   - NODE_ENV: ${NODE_ENV}"
echo -e "   - FIRESTORE_EMULATOR_HOST: localhost:${FIRESTORE_PORT}"
echo -e "   - ADMIN_USER: ${ADMIN_USER}"
echo -e "   - ADMIN_PASSWORD: ${ADMIN_PASSWORD:+***set***}"
cd server
# Pass all environment variables to the Nest.js process
# Using env to ensure variables are passed to the npm process
env \
  FIRESTORE_EMULATOR_HOST="localhost:${FIRESTORE_PORT}" \
  NODE_ENV="${NODE_ENV}" \
  ADMIN_USER="${ADMIN_USER}" \
  ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
  npm run start:dev > /tmp/nestjs-server.log 2>&1 &
SERVER_PID=$!
cd ..

# Wait a bit for server to start
sleep 5

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Nest.js server. Check /tmp/nestjs-server.log for details.${NC}"
    echo -e "${YELLOW}Last 20 lines of log:${NC}"
    tail -20 /tmp/nestjs-server.log
    kill $FIRESTORE_PID 2>/dev/null || true
    exit 1
fi

# Show recent server output
echo -e "${BLUE}📋 Recent server output:${NC}"
tail -10 /tmp/nestjs-server.log
echo ""

# Start React development server in the background
echo -e "${BLUE}⚛️  Starting React development server...${NC}"
cd client
npm start > /tmp/react-server.log 2>&1 &
CLIENT_PID=$!
cd ..

# Wait a bit for React server to start
sleep 3

# Check if React server started successfully
if ! kill -0 $CLIENT_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start React server. Check /tmp/react-server.log for details.${NC}"
    kill $SERVER_PID 2>/dev/null || true
    kill $FIRESTORE_PID 2>/dev/null || true
    exit 1
fi

echo -e "\n${GREEN}✅ All services are running!${NC}\n"
echo -e "${GREEN}📍 Services:${NC}"
echo -e "   - React App:        ${BLUE}http://localhost:3000${NC}"
echo -e "   - Nest.js API:      ${BLUE}http://localhost:8080${NC}"
echo -e "   - Firestore:        ${BLUE}localhost:${FIRESTORE_PORT}${NC}"
echo -e "   - Emulator UI:      ${BLUE}http://localhost:4000${NC}"
echo -e "\n${YELLOW}📋 To view server logs in real-time:${NC}"
echo -e "   ${BLUE}tail -f /tmp/nestjs-server.log${NC}"
echo -e "   ${BLUE}tail -f /tmp/firestore-emulator.log${NC}"
echo -e "   ${BLUE}tail -f /tmp/react-server.log${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for processes
wait $SERVER_PID $FIRESTORE_PID $CLIENT_PID
