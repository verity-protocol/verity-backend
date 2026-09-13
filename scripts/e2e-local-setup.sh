#!/usr/bin/env bash
#
# Opt-in local Stellar sandbox setup for the Verity backend e2e suite.
#
# Spins up a local Stellar standalone network (via Docker), funds a keypair,
# deploys the Verity contracts, and writes test/e2e-local/.e2e-local.env.
#
# Prerequisites (each is checked with a clear message if missing):
#   - Docker (required)
#   - stellar CLI: https://github.com/stellar/stellar-cli (optional; needed
#     for key funding and contract deployment)
#   - verity-contracts checkout: ../verity-contracts relative to the backend,
#     override with the STELLAR_CONTRACTS_DIR env var (optional; needed for
#     contract deployment)
#
# Run it with:
#   pnpm run e2e:local:setup
#
# Then run the suite with:
#   pnpm run test:e2e:local
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/test/e2e-local/.e2e-local.env"
CONTAINER_NAME="verity-soroban-sandbox"
IMAGE="${STELLAR_QUICKSTART_IMAGE:-stellar/quickstart:testing}"
HOST_HTTP_URL="http://localhost:8000"
RPC_URL="${HOST_HTTP_URL}/rpc"
PASSPHRASE="Standalone Network ; February 2017"
KEY_ALIAS="verity_local"
DID_CONTRACT_ID=""

mkdir -p "$ROOT_DIR/test/e2e-local"

fail() {
  echo "error: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is required. Install it and make sure the daemon is running."

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "-> Starting existing sandbox container ($CONTAINER_NAME)..."
  docker start "$CONTAINER_NAME" >/dev/null
else
  echo "-> Launching Stellar standalone sandbox (image: $IMAGE)..."
  docker run -d --name "$CONTAINER_NAME" -p 8000:8000 \
    -e NETWORK=standalone \
    -e ENABLE_SOROBAN_RPC=1 \
    "$IMAGE" >/dev/null || fail "Failed to launch the sandbox container (image=$IMAGE). Pull may require network access."
fi

wait_for() {
  local tries=120
  while [ "$tries" -gt 0 ]; do
    if "$@" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    tries=$((tries - 1))
  done
  return 1
}

echo "-> Waiting for Horizon on ${HOST_HTTP_URL}..."
wait_for curl -sf "$HOST_HTTP_URL" \
  || fail "Horizon did not become healthy. Check: docker logs $CONTAINER_NAME"

echo "-> Waiting for Soroban RPC on ${RPC_URL}..."
wait_for curl -sf "$RPC_URL" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  || fail "Soroban RPC did not become healthy. Check: docker logs $CONTAINER_NAME"

SOURCE=""
SECRET=""
if command -v stellar >/dev/null 2>&1; then
  echo "-> Funding keypair '$KEY_ALIAS' (stellar CLI)..."
  stellar keys fund "$KEY_ALIAS" --network standalone || fail "stellar keys fund failed. Is the sandbox reachable?"
  SOURCE="$(stellar keys address "$KEY_ALIAS")"
  SECRET="$(stellar keys show "$KEY_ALIAS")"
else
  echo "warning: stellar CLI not found; funding and deployment skipped."
fi

# ---------- Contract deployment ---------------------------------------------
CONTRACTS_DIR="${STELLAR_CONTRACTS_DIR:-$ROOT_DIR/../verity-contracts}"
if [ -n "$SOURCE" ] && [ -d "$CONTRACTS_DIR" ]; then
  WASM_BASE="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/verity_did_registry.wasm"
  if [ ! -f "$WASM_BASE" ]; then
    echo "-> Building verity_did_registry wasm ($CONTRACTS_DIR)..."
    command -v cargo >/dev/null 2>&1 || fail "cargo not found; build verity-contracts wasm manually."
    rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown \
      || fail "wasm32-unknown-unknown target not installed. Run: rustup target add wasm32-unknown-unknown"
    (cd "$CONTRACTS_DIR" && cargo build --release --target wasm32-unknown-unknown -p verity_did_registry) \
      || fail "cargo build failed."
  fi
  echo "-> Deploying did_registry to the standalone network..."
  DID_CONTRACT_ID="$(stellar contract deploy --wasm "$WASM_BASE" --source "$KEY_ALIAS" --network standalone)"
  echo "   did_registry contract: $DID_CONTRACT_ID"
fi

if [ -z "$DID_CONTRACT_ID" ]; then
  echo "warning: contracts were not deployed. Deploy verity_did_registry manually and"
  echo "         set STELLAR_DID_REGISTRY_CONTRACT_ID in $ENV_FILE"
fi

cat > "$ENV_FILE" <<EOF
STELLAR_HORIZON_URL=$HOST_HTTP_URL
STELLAR_RPC_URL=$RPC_URL
STELLAR_PASSPHRASE=$PASSPHRASE
STELLAR_DID_REGISTRY_CONTRACT_ID=$DID_CONTRACT_ID
STELLAR_QUERY_SOURCE=$SOURCE
STELLAR_SIGNING_SECRET=$SECRET
EOF

echo
echo "Environment written to $ENV_FILE"
echo "Run the suite with: pnpm run test:e2e:local"