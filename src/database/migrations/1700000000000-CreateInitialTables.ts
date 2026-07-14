import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1700000000000 implements MigrationInterface {
  name = 'CreateInitialTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "did" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "address" VARCHAR NOT NULL UNIQUE,
        "owner" VARCHAR NOT NULL,
        "is_verified" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "address" VARCHAR NOT NULL,
        "did_id" UUID NOT NULL,
        "is_primary" BOOLEAN NOT NULL DEFAULT false,
        "linked_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_wallets_did" FOREIGN KEY ("did_id") REFERENCES "did"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "issuers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "address" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "credentials" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "did_id" UUID NOT NULL,
        "issuer_id" UUID NOT NULL,
        "credential_type" VARCHAR NOT NULL,
        "credential_hash" VARCHAR NOT NULL,
        "is_revoked" BOOLEAN NOT NULL DEFAULT false,
        "issued_at" TIMESTAMP NOT NULL DEFAULT now(),
        "revoked_at" TIMESTAMP,
        CONSTRAINT "FK_credentials_did" FOREIGN KEY ("did_id") REFERENCES "did"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_credentials_issuer" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "nullifiers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "hash" VARCHAR NOT NULL UNIQUE,
        "did_id" UUID,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_nullifiers_did" FOREIGN KEY ("did_id") REFERENCES "did"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "authorization_sessions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "token" VARCHAR NOT NULL UNIQUE,
        "did_id" UUID NOT NULL,
        "app_name" VARCHAR NOT NULL,
        "app_url" VARCHAR NOT NULL,
        "status" VARCHAR NOT NULL DEFAULT 'pending',
        "requested_claims" JSONB NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP NOT NULL,
        "resolved_at" TIMESTAMP,
        CONSTRAINT "FK_auth_sessions_did" FOREIGN KEY ("did_id") REFERENCES "did"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "connected_apps" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "did_id" UUID NOT NULL,
        "app_name" VARCHAR NOT NULL,
        "app_url" VARCHAR NOT NULL,
        "access_granted_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_connected_apps_did" FOREIGN KEY ("did_id") REFERENCES "did"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "indexer_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "event_type" VARCHAR NOT NULL,
        "contract_id" VARCHAR NOT NULL,
        "ledger" INTEGER NOT NULL,
        "transaction_hash" VARCHAR NOT NULL,
        "data" JSONB,
        "processed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_wallets_did_id" ON "wallets" ("did_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_credentials_did_id" ON "credentials" ("did_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_credentials_issuer_id" ON "credentials" ("issuer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_sessions_token" ON "authorization_sessions" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_connected_apps_did_id" ON "connected_apps" ("did_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_indexer_events_type" ON "indexer_events" ("event_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "indexer_events"`);
    await queryRunner.query(`DROP TABLE "connected_apps"`);
    await queryRunner.query(`DROP TABLE "authorization_sessions"`);
    await queryRunner.query(`DROP TABLE "nullifiers"`);
    await queryRunner.query(`DROP TABLE "credentials"`);
    await queryRunner.query(`DROP TABLE "issuers"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "did"`);
  }
}
