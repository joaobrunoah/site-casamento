# Changes Summary

## Folder Renamed
- ✅ `functions/` → `server/`

## Client Updates
- ✅ Updated `client/src/utils/api.ts` to use Nest.js server:
  - Development: `http://localhost:8080` (Nest.js server)
  - Production: Uses `REACT_APP_API_URL` environment variable (Cloud Run URL)
  - Removed Firebase Functions emulator URL logic

## Deployment Script (`deploy.sh`)
- ✅ Updated to reference `server/` instead of `functions/`
- ✅ Added Cloud Run deployment option (`--cloud-run-only`)
- ✅ Updated `--functions-only` to `--server-only` (builds server)
- ✅ Full deployment now includes Cloud Run deployment
- ✅ Cloud Run deployment requires `ADMIN_USER` and `ADMIN_PASSWORD` environment variables

## Local Development Script (`run-local.sh`)
- ✅ Updated to run Nest.js server instead of Firebase Functions emulator
- ✅ Nest.js server runs on port 8080
- ✅ Firestore emulator runs on port 8081 (to avoid conflict with Nest.js)
- ✅ Starts three services:
  - React dev server (port 3000)
  - Nest.js server (port 8080)
  - Firestore emulator (port 8081)

## Firebase Configuration (`firebase.json`)
- ✅ Updated functions source path from `functions` to `server`
- ✅ Updated Firestore emulator port to 8081 (to avoid conflict with Nest.js on 8080)
- ✅ Removed functions emulator configuration (no longer needed)

## Server Configuration
- ✅ Updated `server/package.json` name from "functions" to "wedding-api-server"
- ✅ Updated `server/src/firebase/firebase.service.ts` to handle Firestore emulator on port 8081

## Documentation
- ✅ Updated `MIGRATION_GUIDE.md` to reference `server/` folder
- ✅ Updated `server/README.md` with folder name context

## Usage

### Local Development
```bash
./run-local.sh
```
This will start:
- React app on http://localhost:3000
- Nest.js API on http://localhost:8080
- Firestore emulator on localhost:8081

### Deployment
```bash
# Deploy everything (hosting, server to Cloud Run, firestore)
./deploy.sh

# Deploy only Cloud Run server
./deploy.sh --cloud-run-only

# Deploy only hosting
./deploy.sh --hosting-only

# Deploy only Firestore rules
./deploy.sh --firestore-only
```

### Environment Variables
For Cloud Run deployment, set:
```bash
export ADMIN_USER=your-username
export ADMIN_PASSWORD=your-password
```

For local development, these can be set in the shell or the script will use defaults.
