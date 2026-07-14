# Verity Backend

Backend API, Horizon integration, and KYC verifier service for **Verity** — self-sovereign identity on Stellar.

> Prove who you are, reveal nothing.

## What is Verity?

Verity is a decentralized identity protocol built on Stellar and Soroban. This backend service handles:

- **DID Resolution API** — resolves a DID to its verification status
- **KYC Verifier Service** — receives documents, passes to external KYC provider, issues credentials on-chain, immediately deletes documents
- **OAuth Authorization Service** — manages the "Verify with Verity" popup flow for third-party apps
- **Indexer Service** — listens to Horizon events and indexes DID creation, credential issuance, and revocation into PostgreSQL

The backend never stores user documents. It mediates between the frontend, external KYC providers, and the Stellar blockchain.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        verity-backend                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  DID Module   │  │  Auth Module  │  │  KYC Module          │  │
│  │  ─────────── │  │  ──────────  │  │  ──────────────────  │  │
│  │  Create DIDs  │  │  OAuth flow   │  │  Document upload     │  │
│  │  Wallet mgmt  │  │  Sessions     │  │  KYC provider call   │  │
│  │  Resolution   │  │  Token verify │  │  Credential issue    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                     │               │
│  ┌──────┴──────────────────┴─────────────────────┴───────────┐  │
│  │                    Stellar Service                         │  │
│  │  Horizon API calls, Soroban RPC, transaction building     │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │               PostgreSQL (TypeORM)                         │  │
│  │  did, wallets, credentials, issuers, nullifiers,          │  │
│  │  authorization_sessions, connected_apps, indexer_events    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Modules

| Module | Purpose | Key Endpoints |
|--------|---------|---------------|
| **did** | DID creation, wallet management, resolution | `POST /did`, `GET /did/:id`, `POST /did/:id/wallets` |
| **credential** | Credential issuance, revocation, validation | `POST /credentials`, `POST /credentials/:did/:type/revoke` |
| **auth** | OAuth-style "Verify with Verity" popup flow | `POST /auth/sessions`, `POST /auth/sessions/:token/approve` |
| **kyc** | Document submission and KYC provider integration | `POST /kyc/submit`, `GET /kyc/status/:id` |
| **stellar** | Stellar SDK integration, Horizon API helpers | (service only, no HTTP endpoints) |
| **issuer** | Admin registry of approved KYC providers | `GET /issuers`, `POST /issuers` |
| **indexer** | Horizon event listener, indexing into PostgreSQL | `GET /events`, `POST /indexer/sync` |

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### DID

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/did` | Create a new DID |
| `GET` | `/did/:identifier` | Resolve a DID to its verification status |
| `GET` | `/did/:identifier/wallets` | List all linked wallets |
| `POST` | `/did/:identifier/wallets` | Link a new wallet |
| `DELETE` | `/did/:identifier/wallets/:address` | Remove a wallet |
| `PATCH` | `/did/:identifier/verification` | Set verification status (admin) |

### Credential

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/credentials` | Issue a credential (issuer only) |
| `GET` | `/credentials/:did` | List all credentials for a DID |
| `GET` | `/credentials/:did/:type` | Get a specific credential |
| `POST` | `/credentials/:did/:type/revoke` | Revoke a credential |

### Auth (OAuth Popup Flow)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/sessions` | Create authorization session |
| `GET` | `/auth/sessions/:token` | Get session status |
| `POST` | `/auth/sessions/:token/approve` | User approves |
| `POST` | `/auth/sessions/:token/deny` | User denies |
| `POST` | `/auth/tokens/verify` | Exchange token for verified signal |

### KYC

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/kyc/submit` | Submit document for verification |
| `GET` | `/kyc/status/:submissionId` | Check verification status |

### Issuer (Admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/issuers` | List all approved issuers |
| `POST` | `/issuers` | Register a new issuer |
| `DELETE` | `/issuers/:address` | Remove an issuer |

### Indexer

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/events` | List indexed Stellar events |
| `POST` | `/indexer/sync` | Trigger manual sync |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL 16+
- Docker (optional)

### Install

```bash
git clone https://github.com/verity-stellar/verity-backend.git
cd verity-backend
cp .env.example .env
pnpm install
```

### Run Locally

```bash
# With Docker Compose (recommended)
docker compose up -d

# Or manually
pnpm run migration:run
pnpm run start:dev
```

### Run Migrations

```bash
pnpm run migration:run
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | `development`, `production`, or `test` | No | `development` |
| `PORT` | Server listen port | No | `3000` |
| `DB_HOST` | PostgreSQL host | Yes | `localhost` |
| `DB_PORT` | PostgreSQL port | No | `5432` |
| `DB_USERNAME` | PostgreSQL user | Yes | — |
| `DB_PASSWORD` | PostgreSQL password | Yes | — |
| `DB_NAME` | PostgreSQL database | Yes | — |
| `STELLAR_NETWORK` | `standalone`, `testnet`, or `mainnet` | Yes | `testnet` |
| `STELLAR_HORIZON_URL` | Horizon API base URL | Yes | — |
| `STELLAR_RPC_URL` | Soroban RPC endpoint | Yes | — |
| `STELLAR_PASSPHRASE` | Network passphrase | Yes | — |
| `KYC_PROVIDER_API_URL` | External KYC provider base URL | Yes | — |
| `KYC_PROVIDER_API_KEY` | External KYC provider API key | Yes | — |
| `CORS_ORIGIN` | Allowed CORS origin(s) | No | `*` |
| `SESSION_EXPIRY_MINUTES` | OAuth session token lifetime | No | `5` |

## Testing

```bash
pnpm test           # Unit tests
pnpm run test:e2e   # E2E tests
pnpm run test:cov   # Coverage report
```

## Project Structure

```
src/
├── main.ts                    # Bootstrap, global pipes/filters
├── app.module.ts              # Root module
├── config/                    # Environment validation, configuration
├── database/                  # TypeORM config, migrations
├── common/                    # Shared filters, interceptors, decorators
└── modules/
    ├── did/                   # DID management (FULL implementation)
    ├── credential/            # Credential lifecycle (stubs)
    ├── auth/                  # OAuth popup flow (stubs)
    ├── kyc/                   # KYC verification (stubs)
    ├── stellar/               # Stellar SDK integration (stubs)
    ├── issuer/                # KYC provider registry (stubs)
    └── indexer/               # Horizon event indexing (stubs)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache License 2.0 — see [LICENSE](LICENSE).
