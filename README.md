# Site de Casamento

A wedding website built with React.js (TypeScript), a Nest.js backend, and Firestore Database.

## Tech Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Nest.js server (TypeScript)
- **Database**: Firestore Database
- **Frontend hosting**: Firebase Hosting
- **Backend hosting**: Google Cloud Run

## Prerequisites

- Node.js (v22 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK (gcloud CLI) for backend deployment to Cloud Run
- A Firebase/Google Cloud project (create one at [Firebase Console](https://console.firebase.google.com/))

## Setup Instructions

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase Project

If you haven't already, initialize your Firebase project:

```bash
firebase init
```

Or manually update `.firebaserc` with your project ID:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 4. Install Dependencies

Install all dependencies for the project:

```bash
npm run install-all
```

### 5. Configure Firebase

1. Create a `.env` file in the `client` directory:
   ```bash
   touch client/.env
   ```

2. Get your Firebase configuration from Firebase Console:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click on the web app icon (</>) or create a new web app
   - Copy the configuration values

3. Add your Firebase configuration to `client/.env`:
   ```
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

   **Note:** The `firebase.ts` file is already configured to use these environment variables. If you don't set up the `.env` file, you'll need to update `client/src/firebase.ts` directly with your configuration.

## Development

### Run Everything Locally

To run the client, Nest.js server, and Firestore emulator together:

```bash
npm run dev
# or
./run-local.sh
```

This will start:
- React development server at `http://localhost:3000`
- Nest.js API server at `http://localhost:8080`
- Firestore emulator at `localhost:8081`
- Firebase Emulator UI at `http://localhost:4000`

Press `Ctrl+C` to stop all services.

### Run Services Individually

**Frontend only:**
```bash
cd client
npm start
```

**Nest.js server only:**
```bash
cd server
npm run start:dev
```

**Firestore emulator only:**
```bash
firebase emulators:start --only firestore
```

## Building

Build the frontend and Nest.js server:

```bash
npm run build
```

## Deployment

The deployment script deploys the **frontend** to Firebase Hosting, the **backend** (Nest.js server) to **Google Cloud Run**, and **Firestore** rules/indexes to Firebase.

### Deploy Everything

Deploy frontend (Firebase Hosting), backend (Cloud Run), and Firestore rules/indexes:

```bash
npm run deploy
```

Or use the deployment script directly:

```bash
./deploy.sh
```

Ensure you are logged in to both Firebase and Google Cloud:

```bash
firebase login
gcloud auth login
```

For full deployment you need `ADMIN_USER` and `ADMIN_PASSWORD` in `server/.env.prod` (used by the Cloud Run service).

### Deploy Individual Components

Deploy only the frontend (Firebase Hosting):
```bash
npm run deploy:hosting
# or
./deploy.sh --hosting-only
```

Deploy only the backend (Nest.js server to Google Cloud Run):
```bash
npm run deploy:server
# or
./deploy.sh --server-only
# or
./deploy.sh --cloud-run-only
```

Deploy only Firestore rules and indexes:
```bash
npm run deploy:firestore
# or
./deploy.sh --firestore-only
```

## Project Structure

```
site-casamento/
├── client/                 # React frontend (TypeScript)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── firebase.ts    # Firebase configuration
│   │   └── ...
│   ├── public/
│   └── package.json
├── server/                 # Nest.js backend (TypeScript)
│   ├── src/
│   ├── deploy-cloudrun.sh # Cloud Run deployment script
│   ├── package.json
│   └── tsconfig.json
├── firebase.json           # Firebase configuration
├── .firebaserc            # Firebase project settings
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── deploy.sh              # Deployment script (Hosting + Cloud Run + Firestore)
├── run-local.sh           # Local development script
└── package.json
```

## Nest.js Backend (API)

The backend is a Nest.js server. When deployed, it runs on **Google Cloud Run**. The following API endpoints are available:

### Confirmações de Presença (Confirmations)
- `getConfirmacoes`: GET endpoint to fetch all confirmations
- `createConfirmacao`: POST endpoint to create a new confirmation
  - Required fields: `nome`, `email`, `quantidadePessoas`
  - Optional fields: `telefone`, `mensagem`

### Lista de Presentes (Gifts)
- `getPresentes`: GET endpoint to fetch all gifts
- `updatePresente`: PUT endpoint to update a gift (e.g., mark as purchased)
  - Requires: `id` (query parameter or in body), `comprado` (boolean in body)

### Health Check
- `health`: GET endpoint to check if the server is running

All endpoints include CORS support and return JSON responses.

## Firestore Database

The Firestore database is configured with:
- Security rules in `firestore.rules`
- Indexes in `firestore.indexes.json`

Update these files according to your needs.

## Environment Variables

### Production API URL (frontend)

For production builds, create a `.env.production.local` file in the `client` directory with your production API URL (your Cloud Run service URL):

```
REACT_APP_API_URL=https://your-cloud-run-service-url.run.app
```

**Important:** 
- The `.env.production.local` file is gitignored and should not be committed
- During deployment, the deploy script uses this for production builds
- For local development, the frontend points to `http://localhost:8080` (Nest.js server)

### Backend (Nest.js / Cloud Run)

The server uses `server/.env.prod` for production (e.g. `ADMIN_USER`, `ADMIN_PASSWORD`). The deploy script reads these when deploying to Cloud Run.

## Troubleshooting

### Firebase CLI not found
Make sure Firebase CLI is installed globally:
```bash
npm install -g firebase-tools
```

### Not logged in
Login to Firebase:
```bash
firebase login
```

### Build errors
Make sure all dependencies are installed:
```bash
npm run install-all
```

### TypeScript errors
Ensure TypeScript is properly installed in both `client` and `server` directories.

## License

ISC
