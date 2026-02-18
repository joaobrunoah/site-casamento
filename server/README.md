# Wedding API (Nest.js)

Backend for the wedding site. When deployed, it runs on **Google Cloud Run**. All responses are JSON and CORS is enabled.

## Authentication

Protected endpoints use a **hash-based auth** scheme.

### How to authenticate

1. **Get the auth hash** by calling the login endpoint with admin credentials:

   ```http
   POST /login
   Content-Type: application/json

   { "user": "your-admin-username", "password": "your-admin-password" }
   ```

   On success, the response includes a `hash`:

   ```json
   { "success": true, "message": "Login realizado com sucesso", "hash": "abc123..." }
   ```

2. **Send the hash** on every protected request using the header:

   ```http
   X-Auth-Hash: <hash from login>
   ```

   The hash is the SHA-256 hex digest of `ADMIN_USER` + `ADMIN_PASSWORD` (no separator). It does not expire during the server process lifetime; store it in memory or localStorage and reuse it until the user logs out.

### Endpoints that require authentication

Any route marked **Auth required** below must include the `X-Auth-Hash` header. Missing or invalid hash returns `401 Unauthorized`.

---

## API Endpoints

### Health & info

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Root; returns service status. |
| GET | `/health` | No | Health check. |
| GET | `/testFirestore` | No | Checks Firestore connectivity. |
| GET | `/env` | No | Environment info (no secrets). |

---

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | No | Body: `{ "user": string, "password": string }`. Returns `{ success, message, hash }` on success. Use `hash` as `X-Auth-Hash` for protected endpoints. |

---

### Config

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/getConfig` | No | Returns site config (e.g. feature flags). |
| POST | `/updateConfig` | **Yes** | Body: config object (merged). Updates site config. |

---

### Gifts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/listGifts` | No | List all gifts. |
| GET | `/getGift` | No | Query: `id`. Returns one gift. |
| POST | `/postGift` | **Yes** | Body: `id?`, `nome`, `descricao?`, `preco?`, `estoque?`, `imagem?`. Create or update a gift. |
| DELETE | `/deleteGift` | **Yes** | Query or body: `id`. Deletes a gift. |

---

### Invites

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/listInvites` | No | List all invites (with nested guests). |
| GET | `/getInvite` | No | Query: `id`. Returns one invite with guests. |
| POST | `/postInvite` | **Yes** | Body: invite fields (e.g. `nomeDoConvite`, `ddi?`, `telefone?`, `grupo?`, `observacao?`, `guests?`, `id?`). Create or update invite. |
| PUT | `/updateInvite` | **Yes** | Body: invite fields including `id`. Update existing invite. |
| DELETE | `/deleteInvite` | **Yes** | Query or body: `id`. Deletes an invite. |
| POST | `/updateInviteConfirmation` | No | Body: `id`, `guests?`, and confirmation fields (e.g. intolerances, transport, dates). Guest-facing confirmation update. |

---

### Guests

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/getGuest` | No | Query: `id`. Returns one guest. |
| POST | `/postGuest` | **Yes** | Body: `inviteId`, optional `id`, `nome?`, `genero?`, `faixaEtaria?`, `custo?`, `situacao?`, `mesa?`. Create or update guest. |
| PUT | `/updateGuest` | **Yes** | Body: guest fields including `id`. Update existing guest. |
| DELETE | `/deleteGuest` | **Yes** | Query or body: `id`. Deletes a guest. |

---

### Payment

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payment/create-preference` | No | Body: `items`, `payer_email?`, `external_reference?` (purchase id). Creates Mercado Pago checkout preference. Returns `{ init_point, preference_id }`. |
| POST | `/payment/save-purchase` | No | Body: `fromName`, `email?`, `message?`, `gifts`, `totalPrice`, `paymentId?`. Saves a purchase (status `pending`) before payment. Returns `{ id }`. |
| GET | `/payment/purchase/:id` | No | Returns a single purchase by id (for user to see details and payment status). |
| POST | `/payment/webhook` | No | Called by Mercado Pago when payment status changes. Body: `type`, `data.id` (payment id). Updates purchase status from MP API. |
| GET | `/payment/list-purchases` | **Yes** | Returns all purchases from Firestore (admin view). |

---

### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/searchInvitesByGuestName` | No | Query: `name`. Returns invites that have a guest matching the name (fuzzy). |

---

## Example: calling a protected endpoint

```bash
# 1. Login
HASH=$(curl -s -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"user":"admin","password":"your-password"}' \
  | jq -r '.hash')

# 2. Call protected endpoint
curl -X GET "http://localhost:8080/getConfig" -H "X-Auth-Hash: $HASH"
```
