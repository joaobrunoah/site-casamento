#!/bin/bash

# Deployment script for Firebase Hosting, Functions, and Firestore
# Usage: ./deploy.sh [--hosting-only] [--functions-only] [--firestore-only]
# Make sure you have Firebase CLI installed: npm install -g firebase-tools
# Make sure you're logged in: firebase login

set -e  # Exit on error

# Parse arguments
HOSTING_ONLY=false
FUNCTIONS_ONLY=false
FIRESTORE_ONLY=false

for arg in "$@"; do
    case $arg in
        --hosting-only)
            HOSTING_ONLY=true
            ;;
        --functions-only)
            FUNCTIONS_ONLY=true
            ;;
        --firestore-only)
            FIRESTORE_ONLY=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: ./deploy.sh [--hosting-only] [--functions-only] [--firestore-only]"
            exit 1
            ;;
    esac
done

echo "🚀 Starting deployment to Firebase..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ You are not logged in to Firebase. Please run: firebase login"
    exit 1
fi

# Deploy hosting only
if [ "$HOSTING_ONLY" = true ]; then
    echo "📦 Building React frontend..."
    cd client
    # Verify .env.production.local exists and has REACT_APP_API_URL
    if [ -f .env.production.local ]; then
        if grep -q "REACT_APP_API_URL" .env.production.local; then
            echo "✅ Found REACT_APP_API_URL in .env.production.local"
        else
            echo "⚠️  Warning: .env.production.local exists but REACT_APP_API_URL not found"
        fi
    else
        echo "⚠️  Warning: .env.production.local not found"
    fi
    npm install
    NODE_ENV=production npm run build
    cd ..
    
    echo "📤 Deploying frontend to Firebase Hosting..."
    firebase deploy --only hosting
    echo "✅ Hosting deployment complete!"
    exit 0
fi

# Deploy functions only
if [ "$FUNCTIONS_ONLY" = true ]; then
    echo "🔨 Building Firebase Functions..."
    cd functions
    # Copy .env.prod to .env if it exists for production deployment
    if [ -f .env.prod ]; then
        echo "📋 Using .env.prod for production deployment..."
        cp .env.prod .env
    fi
    npm install
    npm run build
    cd ..
    
    echo "📤 Deploying Firebase Functions..."
    firebase deploy --only functions
    echo "✅ Functions deployment complete!"
    exit 0
fi

# Deploy firestore only
if [ "$FIRESTORE_ONLY" = true ]; then
    echo "📤 Deploying Firestore rules and indexes..."
    firebase deploy --only firestore
    echo "✅ Firestore deployment complete!"
    exit 0
fi

# Deploy everything
echo "📦 Building React frontend..."
cd client
# Verify .env.production.local exists and has REACT_APP_API_URL
if [ -f .env.production.local ]; then
    if grep -q "REACT_APP_API_URL" .env.production.local; then
        echo "✅ Found REACT_APP_API_URL in .env.production.local"
    else
        echo "⚠️  Warning: .env.production.local exists but REACT_APP_API_URL not found"
    fi
else
    echo "⚠️  Warning: .env.production.local not found"
fi
npm install
NODE_ENV=production npm run build
cd ..

echo "🔨 Building Firebase Functions..."
cd functions
# Copy .env.prod to .env if it exists for production deployment
if [ -f .env.prod ]; then
    echo "📋 Using .env.prod for production deployment..."
    cp .env.prod .env
fi
npm install
npm run build
cd ..

echo "📤 Deploying to Firebase..."
echo "   - Deploying Firestore rules and indexes..."
firebase deploy --only firestore

echo "   - Deploying Firebase Functions..."
firebase deploy --only functions

echo "   - Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo ""
echo "Your website is now live at: https://$(firebase projects:list | grep $(cat .firebaserc | grep -o '"[^"]*"' | head -1 | tr -d '"') | awk '{print $1}').web.app"
echo ""
echo "To view your Firebase project dashboard, visit: https://console.firebase.google.com/"
