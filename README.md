# Site de Casamento

A wedding website built with React.js (TypeScript), Firebase Functions, and Firestore Database.

## Tech Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Firebase Functions with TypeScript
- **Database**: Firestore Database
- **Hosting**: Firebase Hosting

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))

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

To run the client, functions, and Firestore emulators together:

```bash
npm run dev
# or
./run-local.sh
```

This will start:
- React development server at `http://localhost:3000`
- Firebase Functions emulator at `http://localhost:5001`
- Firestore emulator at `localhost:8080`
- Firebase Emulator UI at `http://localhost:4000`

Press `Ctrl+C` to stop all services.

### Run Services Individually

**Frontend only:**
```bash
cd client
npm start
```

**Firebase Functions and Firestore emulators only:**
```bash
cd functions
npm run serve
# or
firebase emulators:start --only functions,firestore
```

## Building

Build the frontend and functions:

```bash
npm run build
```

## Deployment

### Deploy Everything

Deploy frontend, functions, and Firestore rules/indexes:

```bash
npm run deploy
```

Or use the deployment script directly:

```bash
./deploy.sh
```

### Deploy Individual Components

Deploy only the frontend:
```bash
npm run deploy:hosting
# or
./deploy.sh --hosting-only
```

Deploy only the functions:
```bash
npm run deploy:functions
# or
./deploy.sh --functions-only
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
├── functions/              # Firebase Functions (TypeScript)
│   ├── src/
│   │   └── index.ts       # Functions entry point
│   ├── package.json
│   └── tsconfig.json
├── firebase.json           # Firebase configuration
├── .firebaserc            # Firebase project settings
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── deploy.sh              # Deployment script
├── run-local.sh           # Local development script
└── package.json
```

## Firebase Functions

The functions are located in `functions/src/index.ts`. The following API endpoints are available:

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
- `health`: GET endpoint to check if functions are running

All endpoints include CORS support and return JSON responses.

## Firestore Database

The Firestore database is configured with:
- Security rules in `firestore.rules`
- Indexes in `firestore.indexes.json`

Update these files according to your needs.

## Environment Variables

Create a `.env` file in the `client` directory with your Firebase configuration. The file should contain:

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

**Important:** Add `client/.env` to your `.gitignore` file to avoid committing sensitive credentials.

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
Ensure TypeScript is properly installed in both `client` and `functions` directories.

## License

ISC
