# Contributing to Verity Backend

Thanks for your interest in contributing to Verity Backend! This guide covers how to pick up work, the conventions to follow, and how to submit changes.

## Picking Up an Issue

1. Browse open issues — look for [`good-first-issue`](https://github.com/verity-stellar/verity-backend/labels/good-first-issue) or [`backend-task`](https://github.com/verity-stellar/verity-backend/labels/backend-task) labels
2. Comment on the issue to claim it — mention which module you'll be working on
3. Fork the repo and create a branch from `main`
4. Check the issue's acceptance criteria before you start

**Definition of "done":**
- The endpoint compiles and passes `pnpm run build`
- At least one test covers the new endpoint
- `pnpm run lint` passes
- `pnpm test` passes
- The PR is reviewed and merged

## Development Setup

```bash
git clone https://github.com/verity-stellar/verity-backend.git
cd verity-backend
cp .env.example .env
pnpm install
docker compose up -d       # Starts PostgreSQL
pnpm run migration:run     # Creates tables
pnpm run start:dev         # Starts dev server with hot reload
```

### Prerequisites

- Node.js 22+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- PostgreSQL 16+ (or Docker)

## NestJS Module Conventions

Every feature lives in `src/modules/<name>/` with this structure:

```
modules/<name>/
├── <name>.module.ts        # Module definition
├── <name>.controller.ts    # HTTP route handlers (thin — delegates to service)
├── <name>.service.ts       # Business logic and database access
├── dto/                    # Request/response DTOs with class-validator
│   └── *.dto.ts
└── entities/               # TypeORM entity definitions
    └── *.entity.ts
```

### Module File

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MyController } from './my.controller';
import { MyService } from './my.service';
import { MyEntity } from './entities/my.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MyEntity])],
  controllers: [MyController],
  providers: [MyService],
  exports: [MyService],
})
export class MyModule {}
```

### Controller Rules

- Controllers are **thin** — they validate input and delegate to services
- Every route handler has a doc comment explaining what it does
- Use `@Body()`, `@Param()`, `@Query()` with DTO classes for validation
- Return service results directly — the `TransformInterceptor` wraps in `{ data: ... }`

### Service Rules

- Services hold all business logic and database access
- Use `@InjectRepository(Entity)` for TypeORM repositories
- Throw NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.)
- Stub methods with `TODO` comments explaining the full implementation intent

### DTO Rules

- Every DTO uses `class-validator` decorators for validation
- Separate DTOs from entities — they diverge over time
- Export DTOs from `dto/` directory

## How to Add a New Endpoint

1. **Create the DTO** in `dto/` — add `class-validator` decorators
2. **Add the method to the service** — implement or stub with `TODO`
3. **Add the route to the controller** — use `@Get()`, `@Post()`, etc.
4. **Register entities** in the module's `TypeOrmModule.forFeature()`
5. **Add tests** — unit test for the service, E2E test for the endpoint
6. **Update the README** endpoint table if adding a new endpoint

## Branch Naming

```
feat/<module>-<description>     # New functionality
fix/<module>-<description>      # Bug fix
docs/<description>              # Documentation only
test/<module>-<description>     # Test coverage improvements
```

Examples:
- `feat/did-create-endpoint`
- `fix/credential-revocation-auth`
- `test/kyc-submit-validation`

## PR Guidelines

- **Focused changes** — one module per PR when possible
- **Tests** — every new endpoint needs at least one test
- **No secrets** — never commit API keys, private keys, or passwords
- **Clean history** — rebase on `main` before submitting
- Use the PR template (`.github/pull_request_template.md`)

## Running Tests

```bash
pnpm test            # Unit tests
pnpm run test:watch  # Watch mode
pnpm run test:cov    # Coverage report
pnpm run test:e2e    # E2E tests (requires running PostgreSQL)
```

## Code Style

- **ESLint + Prettier** — run `pnpm run lint` before committing
- **TypeScript strict-ish** — `strictNullChecks` is enabled
- **NestJS conventions** — controllers are thin, services hold logic
- **Doc comments** — every public method should have a brief doc comment

## Questions?

Open a [GitHub Discussion](https://github.com/verity-stellar/verity-backend/discussions) or ask in the issue you're working on.
