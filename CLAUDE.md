# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wedding website with RSVP management, gift registry, and payment processing (Mercado Pago). Monorepo with a React SPA frontend and Nest.js backend.

- **Frontend**: React 18 + TypeScript, hosted on Firebase Hosting
- **Backend**: Nest.js + TypeScript, hosted on Google Cloud Run (Docker)
- **Database**: Google Cloud Firestore (with local emulator for dev)
- **Payments**: Mercado Pago Checkout Pro

## Commands

### Local Development
```bash
npm run dev          # Start all services (React :3000, Nest.js :3001, Firestore emulator :8081)
```

Runs `run-local.sh` which starts React dev server, Nest.js in watch mode, and Firebase emulators.

### Client (React)
```bash
cd client
npm start            # Dev server on :3000
npm run build        # Production build → client/build/
npm test             # Jest tests
```

### Server (Nest.js)
```bash
cd server
npm run start:dev    # Watch mode
npm run build        # Compile TS → dist/
npm run lint         # ESLint with auto-fix
npm test             # Jest unit tests
npm run test:e2e     # E2E tests
npm run seed:gifts:api  # Import gift data via API
```

### Deploy
```bash
npm run deploy              # Deploy everything
npm run deploy:hosting      # Frontend only (Firebase Hosting)
npm run deploy:server       # Backend only (Cloud Run)
npm run deploy:firestore    # Firestore rules/indexes only
```

## Architecture

### Frontend (`client/src/`)

**Routing** (React Router v6, defined in `App.tsx`):
- `/` → Home (countdown, ceremony info)
- `/attending-form` → RSVP form
- `/gifts` → Gift catalog
- `/checkout` → Cart review
- `/payment` → Mercado Pago redirect
- `/checkout/success` → Payment confirmation
- `/admin/*` → Admin pages (login, RSVP list, gift management)

**State** (React Context API — no Redux):
- `AuthContext` — admin authentication token
- `ConfigContext` — site-wide feature flags/settings fetched from API
- `CartContext` — ephemeral gift shopping cart

**API calls** go through `utils/api.ts` (Axios instance configured with base URL).

### Backend (`server/src/`)

Nest.js modular structure. Each feature is a module:

| Module | Responsibility |
|---|---|
| `auth/` | Hash-based admin auth (SHA-256 of credentials), `AuthGuard` validates `X-Auth-Hash` header |
| `firebase/` | `FirebaseService` — single Firestore client abstraction |
| `config/` | Site configuration stored in Firestore |
| `gifts/` | Gift catalog CRUD |
| `invites/` | Invite groups (each group = family/couple with 1+ guests) |
| `guests/` | Individual attendees within an invite |
| `payment/` | Mercado Pago integration + webhook handling |
| `search/` | Guest name search endpoint |

**Note**: `server/src/index.ts` contains legacy inline route implementations that coexist with the modular controllers. New features should follow the modular pattern.

### Authentication

Admin auth uses a simple hash scheme — no JWT. The client sends `X-Auth-Hash: sha256(username + password)` on admin requests. The `AuthGuard` validates this hash server-side. Hash is stored in `AuthContext` for the session duration.

### Data Model

- **Invite**: Guest group with `name`, `phone`, `group`, `observation`, custom fields. Contains 1+ guests.
- **Guest**: Individual attendee with `name`, `gender`, `ageRange`, `cost`, `status`, `table`.
- **Gift**: Registry item with `id`, `name`, `description`, `price`, `stock`, `image`.
- **Purchase**: Payment order linking guests to gifts (via Mercado Pago).
- **Config**: Single Firestore document with site-wide settings.

### Environment Variables

Client (`.env.local`): `REACT_APP_API_URL`, Firebase config vars (`REACT_APP_FIREBASE_*`).

Server (`.env`): `ADMIN_USER`, `ADMIN_PASSWORD`, `GCP_PROJECT`, `MERCADOPAGO_ACCESS_TOKEN`, `FIREBASE_*` credentials.

See `.env.example` in each directory for the full list.
