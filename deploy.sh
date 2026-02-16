#!/bin/bash

# Deployment script for Firebase Hosting, Cloud Run (Nest.js server), and Firestore
# Usage: ./deploy.sh [--hosting-only] [--server-only] [--firestore-only] [--cloud-run-only]
# Make sure you have Firebase CLI and gcloud CLI installed
# Make sure you're logged in: firebase login && gcloud auth login

set -e  # Exit on error

# Function to load ADMIN_USER and ADMIN_PASSWORD from server/.env.prod
load_admin_credentials() {
    local env_file="server/.env.prod"
    
    if [ -f "$env_file" ]; then
        echo "📋 Loading admin credentials from $env_file..."
        # Source the file and export the variables
        # This handles both ADMIN_USER=value and ADMIN_USER="value" formats
        set -a  # Automatically export all variables
        source "$env_file"
        set +a  # Stop automatically exporting
        
        if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASSWORD" ]; then
            echo "⚠️  Warning: $env_file exists but ADMIN_USER or ADMIN_PASSWORD not found"
            return 1
        else
            echo "✅ Loaded admin credentials from $env_file"
            return 0
        fi
    else
        echo "⚠️  $env_file not found"
        return 1
    fi
}

# Parse arguments
HOSTING_ONLY=false
SERVER_ONLY=false
FIRESTORE_ONLY=false
CLOUD_RUN_ONLY=false

for arg in "$@"; do
    case $arg in
        --hosting-only)
            HOSTING_ONLY=true
            ;;
        --server-only)
            SERVER_ONLY=true
            ;;
        --firestore-only)
            FIRESTORE_ONLY=true
            ;;
        --cloud-run-only)
            CLOUD_RUN_ONLY=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: ./deploy.sh [--hosting-only] [--server-only] [--firestore-only] [--cloud-run-only]"
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

# Deploy Cloud Run only
if [ "$CLOUD_RUN_ONLY" = true ]; then
    echo "🚀 Deploying Nest.js server to Cloud Run..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        echo "❌ gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Get project ID from .firebaserc or use default
    PROJECT_ID=$(jq -r '.projects.default' .firebaserc 2>/dev/null || echo "your-project-id")
    REGION="southamerica-east1"
    SERVICE_NAME="wedding-api"
    
    if [ "$PROJECT_ID" = "your-project-id" ]; then
        echo "⚠️  Could not determine project ID from .firebaserc"
        read -p "Enter your GCP project ID: " PROJECT_ID
    fi
    
    # Load admin credentials from .env.prod or environment variables
    if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASSWORD" ]; then
        if ! load_admin_credentials; then
            echo "⚠️  ADMIN_USER and ADMIN_PASSWORD not found in server/.env.prod or environment"
            echo "   These will need to be set in Cloud Run service configuration"
            read -p "Enter ADMIN_USER: " ADMIN_USER
            read -p "Enter ADMIN_PASSWORD: " ADMIN_PASSWORD
        fi
    else
        echo "✅ Using ADMIN_USER and ADMIN_PASSWORD from environment variables"
    fi
    
    cd server
    chmod +x deploy-cloudrun.sh
    ./deploy-cloudrun.sh "$PROJECT_ID" "$REGION" "$ADMIN_USER" "$ADMIN_PASSWORD"
    cd ..
    
    echo "✅ Cloud Run deployment complete!"
    exit 0
fi

# Deploy server only (builds and deploys to Cloud Run)
if [ "$SERVER_ONLY" = true ]; then
    echo "🚀 Building and deploying Nest.js server to Cloud Run..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        echo "❌ gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Get project ID from .firebaserc or use default
    PROJECT_ID=$(jq -r '.projects.default' .firebaserc 2>/dev/null || echo "your-project-id")
    REGION="us-central1"
    SERVICE_NAME="wedding-api"
    
    if [ "$PROJECT_ID" = "your-project-id" ]; then
        echo "⚠️  Could not determine project ID from .firebaserc"
        read -p "Enter your GCP project ID: " PROJECT_ID
    fi
    
    # Load admin credentials from .env.prod or environment variables
    if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASSWORD" ]; then
        if ! load_admin_credentials; then
            echo "⚠️  ADMIN_USER and ADMIN_PASSWORD not found in server/.env.prod or environment"
            echo "   These will need to be set in Cloud Run service configuration"
            read -p "Enter ADMIN_USER: " ADMIN_USER
            read -p "Enter ADMIN_PASSWORD: " ADMIN_PASSWORD
        fi
    else
        echo "✅ Using ADMIN_USER and ADMIN_PASSWORD from environment variables"
    fi
    
    echo "🔨 Building Nest.js server..."
    cd server
    npm install
    npm run build
    
    echo "📤 Deploying to Cloud Run..."
    chmod +x deploy-cloudrun.sh
    ./deploy-cloudrun.sh "$PROJECT_ID" "$REGION" "$ADMIN_USER" "$ADMIN_PASSWORD"
    cd ..
    
    echo "✅ Server deployment complete!"
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

echo "🔨 Building Nest.js server..."
cd server
npm install
npm run build
cd ..

echo "📤 Deploying to Firebase and Cloud Run..."
echo "   - Deploying Firestore rules and indexes..."
firebase deploy --only firestore

echo "   - Deploying Nest.js server to Cloud Run..."
# Get project ID from .firebaserc
PROJECT_ID=$(jq -r '.projects.default' .firebaserc 2>/dev/null || echo "your-project-id")
REGION="us-central1"

if [ "$PROJECT_ID" != "your-project-id" ]; then
    cd server
    # Load admin credentials from .env.prod or environment variables
    if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASSWORD" ]; then
        if ! load_admin_credentials; then
            echo "⚠️  ADMIN_USER and ADMIN_PASSWORD not found in server/.env.prod or environment"
            echo "   Cloud Run deployment may fail."
            echo "   Set them in server/.env.prod or as environment variables."
        fi
    fi
    
    if [ -n "$ADMIN_USER" ] && [ -n "$ADMIN_PASSWORD" ]; then
        chmod +x deploy-cloudrun.sh
        ./deploy-cloudrun.sh "$PROJECT_ID" "$REGION" "$ADMIN_USER" "$ADMIN_PASSWORD"
    else
        echo "❌ Cannot deploy to Cloud Run without ADMIN_USER and ADMIN_PASSWORD"
    fi
    cd ..
else
    echo "⚠️  Could not determine project ID. Skipping Cloud Run deployment."
    echo "   Run with --cloud-run-only to deploy manually."
fi

echo "   - Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo ""
echo "Your website is now live at: https://$(firebase projects:list | grep $(cat .firebaserc | grep -o '"[^"]*"' | head -1 | tr -d '"') | awk '{print $1}').web.app"
echo ""
echo "To view your Firebase project dashboard, visit: https://console.firebase.google.com/"
