# Testing Guide

## Automated Tests

```bash
cd backend
npm run test              # Unit tests
npm run test:watch        # Unit tests in watch mode
npm run test -- --coverage   # Coverage report
npm run test:e2e          # E2E tests (requires running database)
```

### Unit Test Files

**`src/sites/sites.service.spec.ts`**
Tests site creation, listing, metrics retrieval, and compliance status calculation ("Within Limit" vs "Limit Exceeded") using a mocked Drizzle database instance.

**`src/ingestion/ingestion.service.spec.ts`**
Tests the batch ingestion flow including transaction logic and Layer 1 duplicate detection (returning cached results when a `batch_key` has already been processed).

### E2E Test Files

**`test/app.e2e-spec.ts`**
Bootstraps the full NestJS application and verifies it initializes correctly.

## Manual Verification

The following curl commands can be used to verify core features against a running instance. Start the application first using `./start.sh` or the manual development setup described in the README.

### 1. Create a Site

```bash
curl -s -X POST http://localhost:3001/api/sites \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Site","location":"Alberta, Canada","emission_limit":500}' | python3 -m json.tool
```

Expected: `"success": true` with the created site including `"total_emissions_to_date": "0.0000"`.

### 2. Submit a Batch of Readings

```bash
export SITE_ID="<id from step 1>"

curl -s -X POST http://localhost:3001/api/ingest \
  -H "Content-Type: application/json" \
  -d "{
    \"site_id\": \"$SITE_ID\",
    \"batch_key\": \"$(uuidgen)\",
    \"readings\": [
      {\"value\": 50.25, \"recorded_at\": \"2026-01-15T09:00:00Z\"},
      {\"value\": 75.50, \"recorded_at\": \"2026-01-15T09:30:00Z\"}
    ]
  }" | python3 -m json.tool
```

Expected: `"readings_processed": 2`, `"duplicate": false`.

### 3. Verify Metrics and Compliance Status

```bash
curl -s http://localhost:3001/api/sites/$SITE_ID/metrics | python3 -m json.tool
```

Expected: `total_emissions_to_date` reflects the batch total. `status` is "Within Limit" or "Limit Exceeded" depending on whether the total exceeds the emission limit.

### 4. Test Idempotency (Duplicate Prevention)

```bash
export TEST_BATCH="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

# First submission
curl -s -X POST http://localhost:3001/api/ingest \
  -H "Content-Type: application/json" \
  -d "{\"site_id\":\"$SITE_ID\",\"batch_key\":\"$TEST_BATCH\",\"readings\":[{\"value\":100,\"recorded_at\":\"2026-01-15T10:00:00Z\"}]}" | python3 -m json.tool

# Replay the same batch_key (simulating a network retry)
curl -s -X POST http://localhost:3001/api/ingest \
  -H "Content-Type: application/json" \
  -d "{\"site_id\":\"$SITE_ID\",\"batch_key\":\"$TEST_BATCH\",\"readings\":[{\"value\":100,\"recorded_at\":\"2026-01-15T10:00:00Z\"}]}" | python3 -m json.tool
```

Expected: First request returns `"duplicate": false`. Second request returns `"duplicate": true`. The site total increases by 100 only once.

### 5. Test Pessimistic Locking (Concurrent Writes)

```bash
BEFORE=$(curl -s http://localhost:3001/api/sites/$SITE_ID/metrics | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['total_emissions_to_date'])")

for i in $(seq -w 1 10); do
  curl -s -X POST http://localhost:3001/api/ingest \
    -H "Content-Type: application/json" \
    -d "{\"site_id\":\"$SITE_ID\",\"batch_key\":\"$(uuidgen)\",\"readings\":[{\"value\":100,\"recorded_at\":\"2026-01-15T14:${i}:00Z\"}]}" &
done
wait

AFTER=$(curl -s http://localhost:3001/api/sites/$SITE_ID/metrics | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['total_emissions_to_date'])")
python3 -c "print(f'Difference: {float(\"$AFTER\") - float(\"$BEFORE\"):.4f}')"
```

Expected: Difference is exactly 1000.0000. All 10 concurrent requests are processed without lost updates.

### 6. Test Validation and Error Handling

```bash
# Missing required fields
curl -s -X POST http://localhost:3001/api/sites \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

# Negative emission limit
curl -s -X POST http://localhost:3001/api/sites \
  -H "Content-Type: application/json" \
  -d '{"name":"Bad","location":"Here","emission_limit":-5}' | python3 -m json.tool

# Invalid UUID and empty readings
curl -s -X POST http://localhost:3001/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"site_id":"not-a-uuid","batch_key":"also-bad","readings":[]}' | python3 -m json.tool
```

Expected: All return `"success": false` with a structured error response containing a code, message, and validation details.

### 7. Test Frontend Retry Mechanism

1. Open a site detail page and expand "Submit Readings".
2. Fill in a reading value.
3. Stop the backend to simulate a network failure.
4. Click "Submit Batch" -- a red error banner should appear with a "Retry Submission" button.
5. Restart the backend.
6. Click "Retry Submission" -- the submission should succeed using the same batch key.
7. The total emissions on the page should update by the submitted amount, with no double-counting.

## Prerequisites for Running Tests

```bash
# For automated tests (unit + E2E)
docker compose up -d postgres
cd backend && npm install
DATABASE_URL="postgresql://emissions_user:emissions_pass@localhost:5433/emissions_db" npm run db:migrate

# For manual verification
# Use ./start.sh or the manual development setup from the README.
```
