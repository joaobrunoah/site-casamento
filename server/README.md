# Wedding Site API - Nest.js on Cloud Run

This is the Nest.js server for the wedding site API, migrated from Firebase Functions to Cloud Run.

The server folder contains the Nest.js application that replaces the previous Firebase Functions.

## Quick Start

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   export ADMIN_USER=your-admin-username
   export ADMIN_PASSWORD=your-admin-password
   ```

3. Start the development server:
   ```bash
   npm run start:dev
   ```

4. The API will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
npm run start:prod
```

### Deploy to Cloud Run

See `MIGRATION_GUIDE.md` in the project root for detailed deployment instructions.

Quick deploy:
```bash
./deploy-cloudrun.sh your-project-id us-central1
```

## Project Structure

- `src/main.ts` - Application entry point
- `src/app.module.ts` - Root module
- `src/auth/` - Authentication module
- `src/config/` - Configuration endpoints
- `src/invites/` - Invite management
- `src/guests/` - Guest management
- `src/search/` - Search functionality
- `src/health/` - Health check endpoints
- `src/firebase/` - Firebase Admin service

## Environment Variables

- `ADMIN_USER` - Admin username for authentication
- `ADMIN_PASSWORD` - Admin password for authentication
- `PORT` - Server port (default: 8080, Cloud Run sets this automatically)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Firebase service account key (optional, can use Application Default Credentials)

## API Endpoints

All endpoints maintain the same paths as the Firebase Functions version:

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

## Testing

Test the health endpoint:
```bash
curl http://localhost:8080/health
```

Test Firestore connectivity:
```bash
curl http://localhost:8080/testFirestore
```

## Docker

Build the Docker image:
```bash
docker build -t wedding-api .
```

Run locally:
```bash
docker run -p 8080:8080 \
  -e ADMIN_USER=your-username \
  -e ADMIN_PASSWORD=your-password \
  wedding-api
```

## Notes

- The application uses Nest.js framework for better structure and maintainability
- All Firebase Functions endpoints have been converted to Nest.js controllers
- CORS is enabled for all origins (can be restricted in production)
- The application listens on the port specified by the `PORT` environment variable (Cloud Run sets this automatically)
