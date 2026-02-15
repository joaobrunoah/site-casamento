#!/bin/bash

# Deployment script for Firebase Hosting, Functions, and Firestore
# Make sure you have Firebase CLI installed: npm install -g firebase-tools
# Make sure you're logged in: firebase login

set -e  # Exit on error

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

echo "📦 Building React frontend..."
cd client
npm install
npm run build
cd ..

echo "🔨 Building Firebase Functions..."
cd functions
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
