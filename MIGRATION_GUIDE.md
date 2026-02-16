# Migration Guide: Firebase Functions to Cloud Run with Nest.js

This guide explains how to migrate from Firebase Functions to Cloud Run using Nest.js.

## Overview

The application has been migrated from Firebase Functions to a Nest.js application that can be deployed to Cloud Run. All endpoints remain the same, so no client-side changes are required.

## Project Structure

```
server/
├── src/
│   ├── main.ts                 # Nest.js bootstrap
│   ├── app.module.ts          # Root module
│   ├── auth/                   # Authentication module
│   │   ├── auth.service.ts    # Auth logic
│   │   ├── auth.guard.ts      # Auth guard for protected routes
│   │   └── auth.module.ts     # Auth module
│   ├── config/                # Configuration endpoints
│   │   └── config.controller.ts
│   ├── invites/               # Invite management
│   │   └── invites.controller.ts
│   ├── guests/                # Guest management
│   │   └── guests.controller.ts
│   ├── search/                # Search functionality
│   │   └── search.controller.ts
│   ├── health/                # Health check endpoints
│   │   └── health.controller.ts
│   └── firebase/              # Firebase service
│       └── firebase.service.ts
├── Dockerfile                 # Docker configuration
├── cloudbuild.yaml           # Cloud Build configuration
├── deploy-cloudrun.sh        # Deployment script
└── package.json              # Dependencies
```

## Prerequisites

1. **Google Cloud SDK** installed and configured
2. **Docker** installed (for local testing)
3. **Node.js 22** installed
4. **Firebase Admin credentials** configured (service account key)

## Setup Steps

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Set the following environment variables:

```bash
export ADMIN_USER=your-admin-username
export ADMIN_PASSWORD=your-admin-password
```

For Cloud Run deployment, these will be set as environment variables in the service configuration.

### 3. Firebase Admin Setup

Ensure Firebase Admin is properly initialized. You can either:

**Option A: Use Application Default Credentials (Recommended for Cloud Run)**
```bash
gcloud auth application-default login
```

**Option B: Use Service Account Key**
- Download service account key from Firebase Console
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable:
  ```bash
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
  ```

### 4. Local Development

Run the application locally:

```bash
npm run start:dev
```

The API will be available at `http://localhost:8080`

### 5. Test Endpoints

Test the health endpoint:
```bash
curl http://localhost:8080/health
```

Test Firestore connectivity:
```bash
curl http://localhost:8080/testFirestore
```

## Deployment to Cloud Run

### Method 1: Using the Deployment Script

1. Make the script executable:
   ```bash
   chmod +x server/deploy-cloudrun.sh
   ```

2. Set environment variables:
   ```bash
   export ADMIN_USER=your-admin-username
   export ADMIN_PASSWORD=your-admin-password
   ```

3. Run the deployment script:
   ```bash
   cd functions
   ./deploy-cloudrun.sh your-project-id us-central1
   ```

### Method 2: Using gcloud CLI Directly

1. Build and push the image:
   ```bash
   cd functions
   docker build -t gcr.io/YOUR_PROJECT_ID/wedding-api:latest .
   docker push gcr.io/YOUR_PROJECT_ID/wedding-api:latest
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy wedding-api \
     --image gcr.io/YOUR_PROJECT_ID/wedding-api:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --cpu 1 \
     --set-env-vars ADMIN_USER=your-admin-username,ADMIN_PASSWORD=your-admin-password
   ```

### Method 3: Using Cloud Build

1. Set substitution variables:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml \
     --substitutions=_ADMIN_USER=your-admin-username,_ADMIN_PASSWORD=your-admin-password
   ```

## Update Client Configuration

After deployment, update your client's API URL:

1. Get the Cloud Run service URL:
   ```bash
   gcloud run services describe wedding-api --region us-central1 --format 'value(status.url)'
   ```

2. Update `client/.env.production`:
   ```
   REACT_APP_API_URL=https://wedding-api-xxxxx-uc.a.run.app
   ```

3. Rebuild and deploy the client:
   ```bash
   cd client
   npm run build
   firebase deploy --only hosting
   ```

## API Endpoints

All endpoints remain the same as before:

- `GET /health` - Health check
- `GET /testFirestore` - Test Firestore connectivity
- `POST /login` - Admin login
- `GET /getConfig` - Get configuration
- `POST /updateConfig` - Update configuration (requires auth)
- `GET /listInvites` - List all invites
- `GET /getInvite?id=...` - Get single invite
- `POST /postInvite` - Create/update invite (requires auth)
- `PUT /updateInvite?id=...` - Update invite (requires auth)
- `DELETE /deleteInvite?id=...` - Delete invite (requires auth)
- `POST /updateInviteConfirmation` - Update invite confirmation (public)
- `GET /getGuest?id=...` - Get single guest
- `POST /postGuest` - Create/update guest (requires auth)
- `PUT /updateGuest?id=...` - Update guest (requires auth)
- `DELETE /deleteGuest?id=...` - Delete guest (requires auth)
- `GET /searchInvitesByGuestName?name=...` - Search invites by guest name

## Authentication

Protected endpoints require the `X-Auth-Hash` header. Get the hash by calling `/login` with valid credentials.

## Differences from Firebase Functions

1. **Port**: Cloud Run uses the `PORT` environment variable (defaults to 8080)
2. **CORS**: Handled by Nest.js middleware instead of custom function
3. **Error Handling**: Uses Nest.js HttpException instead of Firebase Functions responses
4. **Logging**: Uses console.log instead of functions.logger (Cloud Run captures stdout/stderr)

## Troubleshooting

### Issue: "Firebase Admin not initialized"
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set or Application Default Credentials are configured

### Issue: "Port already in use"
- Change the port in `main.ts` or set `PORT` environment variable

### Issue: "CORS errors"
- Verify CORS configuration in `main.ts`
- Check that the client is using the correct API URL

### Issue: "Authentication fails"
- Verify `ADMIN_USER` and `ADMIN_PASSWORD` environment variables are set correctly
- Check that the hash generation matches between client and server

## Cost Considerations

Cloud Run pricing:
- **Free tier**: 2 million requests/month, 360,000 GB-seconds, 180,000 vCPU-seconds
- **Pay-as-you-go**: $0.40 per million requests, $0.0000025 per GB-second, $0.0000100 per vCPU-second

Compare with Firebase Functions pricing to estimate costs.

## Rollback Plan

If you need to rollback to Firebase Functions:

1. Keep the old `server/src/index.ts` file backed up (if you still have the Firebase Functions version)
2. Redeploy using `firebase deploy --only functions`
3. Update client API URL back to Firebase Functions URL

## Next Steps

1. Set up CI/CD pipeline using Cloud Build
2. Configure custom domain for Cloud Run service
3. Set up monitoring and alerting
4. Configure auto-scaling parameters
5. Set up staging environment
