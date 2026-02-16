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

# Set environment variables for server
if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  ADMIN_USER and ADMIN_PASSWORD not set.${NC}"
    echo -e "${YELLOW}   Setting default values for local development...${NC}"
    export ADMIN_USER=${ADMIN_USER:-admin}
    export ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
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
firebase emulators:start --only firestore --project demo-project > /tmp/firestore-emulator.log 2>&1 &
FIRESTORE_PID=$!

# Wait a bit for Firestore emulator to start
sleep 3

# Check if Firestore emulator started successfully
if ! kill -0 $FIRESTORE_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Firestore emulator. Check /tmp/firestore-emulator.log for details.${NC}"
    echo -e "${YELLOW}Last 20 lines of log:${NC}"
    tail -20 /tmp/firestore-emulator.log
    exit 1
fi

# Start Nest.js server in the background
echo -e "${BLUE}🚀 Starting Nest.js server...${NC}"
cd server
# Pass FIRESTORE_EMULATOR_HOST to the Nest.js process
FIRESTORE_EMULATOR_HOST="localhost:${FIRESTORE_PORT}" npm run start:dev > /tmp/nestjs-server.log 2>&1 &
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
