#!/bin/bash

# Script to run client, functions, and firestore locally
# This script starts:
# - React development server (port 3000)
# - Firebase Functions emulator (port 5001)
# - Firestore emulator (port 8080)
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
    kill $FUNCTIONS_PID 2>/dev/null || true
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

if [ ! -d "functions/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing functions dependencies...${NC}"
    cd functions
    npm install
    cd ..
fi

# Copy .env.local to .env for functions if it exists
if [ -f "functions/.env.local" ]; then
    echo -e "${BLUE}📋 Using .env.local for functions...${NC}"
    cp functions/.env.local functions/.env
fi

# Build functions first
echo -e "${BLUE}🔨 Building Firebase Functions...${NC}"
cd functions
npm run build
cd ..

# Start Firebase emulators in the background
echo -e "${BLUE}🔥 Starting Firebase emulators (Functions & Firestore)...${NC}"
firebase emulators:start --only functions,firestore > /tmp/firebase-emulators.log 2>&1 &
FUNCTIONS_PID=$!

# Wait a bit for emulators to start
sleep 3

# Check if emulators started successfully
if ! kill -0 $FUNCTIONS_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Firebase emulators. Check /tmp/firebase-emulators.log for details.${NC}"
    exit 1
fi

# Start React development server in the background
echo -e "${BLUE}⚛️  Starting React development server...${NC}"
cd client
REACT_APP_USE_EMULATORS=true npm start > /tmp/react-server.log 2>&1 &
CLIENT_PID=$!
cd ..

# Wait a bit for React server to start
sleep 3

# Check if React server started successfully
if ! kill -0 $CLIENT_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start React server. Check /tmp/react-server.log for details.${NC}"
    kill $FUNCTIONS_PID 2>/dev/null || true
    exit 1
fi

echo -e "\n${GREEN}✅ All services are running!${NC}\n"
echo -e "${GREEN}📍 Services:${NC}"
echo -e "   - React App:        ${BLUE}http://localhost:3000${NC}"
echo -e "   - Firebase Functions: ${BLUE}http://localhost:5001${NC}"
echo -e "   - Firestore:         ${BLUE}localhost:8080${NC}"
echo -e "   - Emulator UI:       ${BLUE}http://localhost:4000${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for processes
wait $FUNCTIONS_PID $CLIENT_PID
