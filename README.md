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

### StellarService test strategy & its blind spot

`StellarService` behavior is covered by **mocked unit tests** (`src/modules/stellar/stellar.service.spec.ts`) that run in CI: fast, deterministic, no network. They prove the service encodes arguments and parses responses the way the code *expects* `@stellar/stellar-sdk` and Horizon/RPC behave.

That is the entire point — and the entire limitation. Mocks can never prove the code matches what the real network/RPC *actually* does. If Horizon changes a response shape, or the SDK changes how it encodes a value (a live risk right after any SDK/dependency bump), mocked tests can stay green while the service silently breaks against the real network. Always keep this in mind when reviewing changes that touch `StellarService`.

### Local sandbox e2e (opt-in, manual)

To catch that real-network drift, an opt-in e2e suite runs the real `StellarService` against a local Stellar standalone network. It is intentionally **not** part of `pnpm test` and **not** invoked by CI.

Prerequisites:

- Docker (required)
- stellar CLI (`stellar`) for key funding + contract deployment
- a `verity-contracts` checkout alongside this repo (default `../verity-contracts`, override with `STELLAR_CONTRACTS_DIR`)
- `wasm32-unknown-unknown` Rust target (`rustup target add wasm32-unknown-unknown`)
- wasm artifacts (optional): to actually exercise the contracts, [build verity-contracts](https://github.com/verity-protocol/verity-contracts) into `target/wasm32-unknown-unknown/release`.

Run it:

```bash
pnpm run e2e:local:setup   # starts the sandbox, funds a key, deploys did_registry
pnpm run test:e2e:local    # runs the suite against the live sandbox
```

**Run this before submitting a PR that touches `StellarService`, after any `@stellar/stellar-sdk` bump, and before cutting a release.**

If a prerequisite is missing, the setup script still starts the sandbox and writes `test/e2e-local/.e2e-local.env` (gitignored) with the values it could produce; fill in the missing ones and re-run `pnpm run test:e2e:local`. The suite self-skips with a message when the required env vars aren't set.

## Project Structure

```
verity-backend/
├── src/
│   ├── main.ts                  # Bootstrap, global pipes/filters, Swagger setup
│   ├── app.module.ts            # Root module
│   ├── app.controller.ts        # Health check endpoint
│   ├── common/
│   │   ├── constants/           # Shared constants
│   │   ├── decorators/          # Custom decorators (@Public)
│   │   ├── filters/             # Exception filters
│   │   └── interceptors/        # Response transformation
│   ├── config/                  # Environment validation, configuration
│   ├── database/                # TypeORM config, migrations
│   └── modules/
│       ├── did/                 # DID management (reference implementation)
│       ├── credential/          # Credential lifecycle (stubs)
│       ├── auth/                # OAuth popup flow (stubs)
│       ├── kyc/                 # KYC verification (stubs)
│       ├── stellar/             # Stellar SDK integration (stubs)
│       ├── issuer/              # KYC provider registry (stubs)
│       └── indexer/             # Horizon event indexing (stubs)
├── test/                        # E2E tests
├── Dockerfile                   # Multi-stage Docker build
├── docker-compose.yml           # Local dev with PostgreSQL 16
├── .github/                     # CI, issue templates, PR template
└── package.json                 # pnpm, NestJS 11, TypeORM
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License — see [LICENSE](LICENSE).
