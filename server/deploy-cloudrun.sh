#!/bin/bash

# Deploy to Cloud Run script
# Usage: ./deploy-cloudrun.sh [project-id] [region] [admin-user] [admin-password]
# Requires Docker to be installed and running
# Requires gcloud CLI to be installed and authenticated

set -e

PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"us-central1"}
ADMIN_USER=${3:-"admin"}
ADMIN_PASSWORD=${4:-"admin"}
SERVICE_NAME="wedding-api"
REPOSITORY_NAME="wedding-api-repo"

echo "🚀 Deploying to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
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

# Check for required environment variables
if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ ADMIN_USER and ADMIN_PASSWORD are required."
    echo "   Please provide them as arguments:"
    echo "   ./deploy-cloudrun.sh PROJECT_ID REGION ADMIN_USER ADMIN_PASSWORD"
    echo "   Or set them as environment variables before running this script."
    exit 1
fi

# Validate project ID
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo "❌ Invalid project ID. Please provide a valid GCP project ID."
    exit 1
fi

# Set the project
echo "📋 Setting GCP project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com --quiet || true
gcloud services enable run.googleapis.com --quiet || true
gcloud services enable artifactregistry.googleapis.com --quiet || true

# Create Artifact Registry repository if it doesn't exist
echo "📦 Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe "$REPOSITORY_NAME" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    echo "📦 Creating Artifact Registry repository..."
    gcloud artifacts repositories create "$REPOSITORY_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Docker repository for wedding-api" \
        --project="$PROJECT_ID" \
        --quiet
else
    echo "✅ Artifact Registry repository already exists"
fi

# Build the Docker image for linux/amd64 (required for Cloud Run)
echo "📦 Building Docker image for linux/amd64..."
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME/$SERVICE_NAME:latest"
docker build --platform linux/amd64 -t "$IMAGE_NAME" .

# Configure Docker to use gcloud as a credential helper for Artifact Registry
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

# Push the image to Artifact Registry
echo "📤 Pushing image to Artifact Registry..."
docker push "$IMAGE_NAME"

# Get the default Cloud Run service account email
SERVICE_ACCOUNT_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
echo "📋 Using service account: $SERVICE_ACCOUNT_EMAIL"

# Grant Firebase Admin permissions to the Cloud Run service account
echo "🔐 Granting Firebase Admin permissions to service account..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/firebase.admin" \
  --quiet || echo "⚠️  Could not grant firebase.admin role (may already be granted or need manual setup)"

# Also grant Firestore User role as a fallback
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/datastore.user" \
  --quiet || echo "⚠️  Could not grant datastore.user role (may already be granted or need manual setup)"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
# Build env vars: required + optional from server/.env.prod (MERCADOPAGO_ACCESS_TOKEN, FRONTEND_URL, MERCADO_PAGO_SECRET_SIGNATURE)
ENV_VARS="ADMIN_USER=$ADMIN_USER,ADMIN_PASSWORD=$ADMIN_PASSWORD,GCP_PROJECT=$PROJECT_ID,GCLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,NODE_ENV=production"
[ -n "$MERCADOPAGO_ACCESS_TOKEN" ] && ENV_VARS="$ENV_VARS,MERCADOPAGO_ACCESS_TOKEN=$MERCADOPAGO_ACCESS_TOKEN"
[ -n "$FRONTEND_URL" ] && ENV_VARS="$ENV_VARS,FRONTEND_URL=$FRONTEND_URL"
[ -n "$MERCADO_PAGO_SECRET_SIGNATURE" ] && ENV_VARS="$ENV_VARS,MERCADO_PAGO_SECRET_SIGNATURE=$MERCADO_PAGO_SECRET_SIGNATURE"

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --update-env-vars "$ENV_VARS" \
  --service-account "$SERVICE_ACCOUNT_EMAIL" \
  --project "$PROJECT_ID" \
  --quiet

# Remove FIRESTORE_EMULATOR_HOST if it exists (separate command since we can't combine with --update-env-vars)
echo "🧹 Removing FIRESTORE_EMULATOR_HOST if present..."
gcloud run services update "$SERVICE_NAME" \
  --region "$REGION" \
  --remove-env-vars "FIRESTORE_EMULATOR_HOST" \
  --project "$PROJECT_ID" \
  --quiet || echo "⚠️  FIRESTORE_EMULATOR_HOST was not set (this is fine)"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)' --project "$PROJECT_ID")

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📝 Update your client's REACT_APP_API_URL to: $SERVICE_URL"
