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

### 4. Install and initialize gcloud CLI

The gcloud CLI is required to deploy the backend to Google Cloud Run.

**Install:** See [Install the gcloud CLI](https://cloud.google.com/sdk/docs/install) for your platform. On macOS with Homebrew:

```bash
brew install --cask google-cloud-sdk
```

**Initialize and log in:**

```bash
gcloud init
gcloud auth login
```

Set the project to match your Firebase project (same project ID as in `.firebaserc`):

```bash
gcloud config set project YOUR_PROJECT_ID
```

### 5. Install Dependencies

Install all dependencies for the project:

```bash
npm run install-all
```

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
├── server/                 # Nest.js backend (TypeScript). API docs: server/README.md
│   ├── src/
│   ├── deploy-cloudrun.sh # Cloud Run deployment script
│   ├── README.md          # API endpoints and authentication
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

For **API documentation** (endpoints, request/response shapes, and authentication), see **[server/README.md](server/README.md)**.

## Firestore Database

The Firestore database is configured with:
- Security rules in `firestore.rules`
- Indexes in `firestore.indexes.json`

Update these files according to your needs.

## Environment Variables

Copy the `.env.example` file in each directory to create your local env file (e.g. `.env`, `.env.local`, or `.env.production.local`). Do not commit real env files—they are gitignored.

### Client (`client/`)

| Variable | Required | When | Description |
|----------|----------|------|-------------|
| `REACT_APP_API_URL` | **Production only** | Production builds | Base URL of the Nest.js API (your Cloud Run service URL). Not needed for local dev—the app uses `http://localhost:8080` in development. |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | No | When using Stripe | Stripe publishable key for client-side payment UI (e.g. Checkout, Elements). |
| `REACT_APP_FIREBASE_PROJECT_ID` | No | Local development | Firebase/GCP project ID. Used when running the app locally (e.g. for Firebase features). |

**Files:**
- **Local development:** Optional. Create `client/.env` or `client/.env.local` if you need `REACT_APP_FIREBASE_PROJECT_ID` or Stripe; otherwise the app defaults to `http://localhost:8080` for the API.
- **Production build:** Create `client/.env.production.local` with `REACT_APP_API_URL` (and `REACT_APP_STRIPE_PUBLISHABLE_KEY` if needed). See `client/.env.example`.

### Server (`server/`)

| Variable | Required | When | Description |
|----------|----------|------|-------------|
| `ADMIN_USER` | Yes | Local and production | Username for admin/basic-auth endpoints. |
| `ADMIN_PASSWORD` | Yes | Local and production | Password for admin/basic-auth endpoints. |
| `STRIPE_SECRET_KEY` | No | When using Stripe | Stripe secret key for server-side payment operations (e.g. creating PaymentIntents, handling webhooks). |
| `FRONTEND_URL` | No | Production | Full URL of the deployed frontend (e.g. for CORS or redirects). Used in production. |
| `PORT` | No | Optional | Port the server listens on (default: 8080). Cloud Run sets this in production. |
| `FIRESTORE_EMULATOR_HOST` | No | Local only | Set by `run-local.sh` when using the Firestore emulator (e.g. `localhost:8081`). Do not set in production. |
| `GCP_PROJECT` / `GCLOUD_PROJECT` / `GOOGLE_CLOUD_PROJECT` | No | Optional | Firebase/GCP project ID. On Cloud Run this is set automatically. For local dev with real Firestore, set one of these. |

**Files:**
- **Local development:** Create `server/.env` or `server/.env.local` with `ADMIN_USER` and `ADMIN_PASSWORD` (and `STRIPE_SECRET_KEY` if using Stripe). See `server/.env.example`.
- **Production (Cloud Run):** Create `server/.env.prod` with `ADMIN_USER`, `ADMIN_PASSWORD`, and optionally `STRIPE_SECRET_KEY` and `FRONTEND_URL`. The deploy script reads this when deploying to Cloud Run.

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

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).
