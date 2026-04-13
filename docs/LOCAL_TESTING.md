# Local Testing Guide

## Prerequisites Checklist

### System Requirements
- [ ] Node.js 18+ (`node --version`)
- [ ] PostgreSQL 14+ (`psql --version`)
- [ ] Aptos CLI (`aptos --version`)
- [ ] Git
- [ ] curl or Postman (for API testing)

## Quick Setup (15 minutes)

### Step 1: Install Dependencies

```bash
# Install Aptos CLI (if not already installed)
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Verify installation
aptos --version

# Initialize Aptos account (if not done)
aptos init --profile testnet --network testnet
```

### Step 2: Setup PostgreSQL Database

```bash
# Create database
createdb split_revenue_db

# Load schema
psql split_revenue_db < database/schema.sql

# Verify tables created
psql split_revenue_db -c "\dt"

# Expected output: 10 tables (users, projects, purchases, etc)
```

### Step 3: Backend Setup

```bash
cd backend

# Install Node dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with local values
# For testing, use defaults:
DATABASE_URL=postgres://postgres:postgres@localhost:5432/split_revenue_db
APTOS_NODE_URL=https://testnet.api.aptos.dev/v1
PORT=3000
```

### Step 4: Start Backend

```bash
npm run dev

# Expected output:
# 🚀 Initializing Split Revenue Platform...
# 📦 Connecting to database...
# ✅ Database connected successfully
# ⛓️  Initializing Aptos connection...
# ✅ Aptos Client connected to https://testnet.api.aptos.dev/v1
# ✅ Server running on port 3000
```

---

## What You Can Test Locally

### ✅ Already Implemented & Ready to Test

#### 1. Database Connection
```bash
curl http://localhost:3000/health

# Response:
# {"status":"ok","timestamp":"2026-04-13T10:00:00.000Z"}
```

#### 2. Wallet Generation
Open `backend/src/wallet.ts` and test directly:

```bash
cd backend
npm run build
node dist/wallet.js

# Or test in Node REPL:
node
> const w = require('./dist/wallet.js');
> const wallet = w.generateAndEncryptWallet();
> console.log(wallet);
// {
//   address: '0x123...',
//   publicKey: '0x456...',
//   encryptedPrivateKey: 'iv:encrypted_data'
// }
```

#### 3. Database Operations
Test the database layer:

```bash
# Create a test user
psql split_revenue_db

postgres=# INSERT INTO users (email, wallet_address, wallet_private_key_encrypted)
VALUES ('test@example.com', '0x123abc', 'encrypted_key_here');

# Query users
SELECT id, email, wallet_address FROM users;
```

### 🟡 Partially Implemented (Endpoints scaffolded, need implementation)

#### API Endpoints (Currently stubs)
```bash
# These endpoints exist but return placeholder messages:

POST /api/auth/signup
# Returns: {"message":"signup endpoint - to be implemented"}

POST /api/projects
# Returns: {"message":"create project endpoint - to be implemented"}

POST /api/payouts/batch
# Returns: {"message":"create payout batch endpoint - to be implemented"}
```

---

## Complete Local Testing Workflow

### Scenario: End-to-End User Flow (Simulated)

#### 1. Test User Registration
```typescript
// File: backend/test-flow.ts (create this)
import { generateAndEncryptWallet } from './src/wallet';
import { createUser, getUserByEmail } from './src/database';

async function testUserFlow() {
  // Generate wallet
  const wallet = generateAndEncryptWallet();
  console.log('Generated wallet:', wallet.address);

  // Create user in DB
  const user = await createUser(
    'creator@example.com',
    wallet.address,
    wallet.encryptedPrivateKey
  );
  console.log('Created user:', user);

  // Retrieve user
  const retrieved = await getUserByEmail('creator@example.com');
  console.log('Retrieved user:', retrieved);

  // Verify encryption/decryption works
  const { decryptPrivateKey } = require('./src/wallet');
  const decrypted = decryptPrivateKey(retrieved.wallet_private_key_encrypted);
  console.log('Decryption successful:', decrypted.length === wallet.publicKey.length);
}

testUserFlow().catch(console.error);
```

Run it:
```bash
npm run build
npx ts-node src/test-flow.ts

# Expected output:
# Generated wallet: 0x...
# Created user: { id: 1, email: 'creator@example.com', ... }
# Retrieved user: { ... encrypted key ... }
# Decryption successful: true
```

#### 2. Test Database Schema Integrity
```bash
# Verify constraints are enforced
psql split_revenue_db

# Try to insert invalid data (should fail)
INSERT INTO projects (creator_id, name, price_usdc_micro, is_active)
VALUES (999, 'Invalid', -100, true);
-- Error: check constraint "check_positive_price" is violated

# Good! Constraints are working
```

#### 3. Test Smart Contract Locally
```bash
cd contracts

# Run Move tests (if any test functions defined)
aptos move test

# Expected: Contract compiles and tests pass

# Try to publish to testnet
aptos move publish --profile testnet

# This will:
# 1. Compile the Move code
# 2. Deploy to Aptos testnet
# 3. Return module address: 0x...
# 4. Save to your aptos account on testnet
```

---

## Testing Scenarios Matrix

| Feature | Local | Status | Notes |
|---------|-------|--------|-------|
| **Wallet Generation** | ✅ | Ready | No external deps |
| **Database Schema** | ✅ | Ready | PostgreSQL required |
| **User Creation** | ✅ | Ready | Database + wallet |
| **Project Creation** | 🟡 | Stub | Endpoint exists, needs impl |
| **Split Config** | 🟡 | Stub | Needs on-chain call |
| **Purchase Webhook** | 🟡 | Stub | Needs Stripe integration |
| **Payout Batch** | 🟡 | Stub | Needs smart contract call |

**✅ = Fully testable locally**  
**🟡 = Needs implementation/external service**

---

## Comprehensive Testing Checklist

### Phase 1: Local Environment (No external services needed)

```bash
# 1. Database
psql split_revenue_db -c "SELECT COUNT(*) FROM users;"
# Expected: (0 rows)

# 2. Backend server
curl -s http://localhost:3000/health | jq .
# Expected: {"status":"ok","timestamp":"..."}

# 3. Wallet encryption/decryption
npm run build
node -e "
const {generateAndEncryptWallet, decryptPrivateKey} = require('./dist/wallet.js');
const w = generateAndEncryptWallet();
const dec = decryptPrivateKey(w.encryptedPrivateKey);
console.log('✅ Wallet generation & encryption working');
"

# 4. Database operations
node -e "
const {getDb, initializeDatabase} = require('./dist/database.js');
initializeDatabase().then(() => {
  console.log('✅ Database connection working');
  process.exit(0);
});
"
```

### Phase 2: Integration Tests (Requires implementation)

After implementing endpoints:

```bash
# Create user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Game",
    "description":"Test project",
    "priceUsdcMicro":49990000,
    "collaborators":[]
  }'
```

### Phase 3: Blockchain Tests (Requires contract deployment)

```bash
# Deploy contracts
cd contracts
aptos move publish --profile testnet

# Get module address from output
export MODULE_ADDRESS="0x..."

# Test on-chain contract calls
cd ../backend
npx ts-node -e "
const {createSplitConfigOnChain} = require('./dist/aptos-client.js');
await createSplitConfigOnChain(
  1n,                                    // project_id
  ['0xaddr1', '0xaddr2'],               // collaborators
  [5000, 5000],                         // 50/50 split
  '0xtreasuryAddr'                      // treasury
);
console.log('✅ On-chain contract call successful');
"
```

---

## Debugging Guide

### Issue: "Database connection refused"
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# If not running, start it:
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Windows: pg ctl -D "C:\Program Files\PostgreSQL\data" start
```

### Issue: "Module not found: aptos"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: "WALLET_ENCRYPTION_KEY not set"
```bash
# Add to .env
echo "WALLET_ENCRYPTION_KEY=your-32-char-minimum-encryption-key-12345" >> backend/.env
```

### Issue: Contract deployment fails
```bash
# Verify Aptos CLI setup
aptos account balance --profile testnet

# If balance is 0:
# Get testnet funds from https://faucet.testnet.aptoslabs.com

# Try deployment again
aptos move publish --profile testnet
```

---

## Quick Test Commands

### Copy-paste these to test everything:

```bash
#!/bin/bash
set -e

echo "🧪 Starting Local Testing Suite"
echo ""

# 1. Check prereqs
echo "✓ Checking prerequisites..."
node --version
psql --version
aptos --version

# 2. Database
echo "✓ Testing database..."
createdb split_revenue_db 2>/dev/null || true
psql split_revenue_db -c "SELECT 1" > /dev/null

# 3. Backend
echo "✓ Starting backend..."
cd backend
npm install > /dev/null 2>&1
cp .env.example .env 2>/dev/null || true
npm run build > /dev/null 2>&1

# 4. Test health endpoint
echo "✓ Testing health endpoint..."
npm run dev &
BACKEND_PID=$!
sleep 3
curl -s http://localhost:3000/health | grep -q "ok" && echo "✅ Health check passed" || echo "❌ Health check failed"
kill $BACKEND_PID 2>/dev/null

echo ""
echo "🎉 All local tests passed! Ready to implement endpoints."
```

---

## What to Test First (Priority Order)

1. **✅ Wallet Generation** (No deps)
   - Test: `npm run build && node` → import wallet functions

2. **✅ Database Schema** (PostgreSQL only)
   - Test: Create users, projects, verify constraints

3. **✅ Backend Server** (Node + DB)
   - Test: `npm run dev` → `curl http://localhost:3000/health`

4. **🟡 User Registration** (Needs implementation)
   - Test after implementing signup endpoint

5. **🟡 Payment Flow** (Needs Stripe + contract calls)
   - Test after full implementation

---

## Test Files to Create

Create these test files in `backend/` as you implement features:

```typescript
// backend/test/wallet.test.ts
import {generateAndEncryptWallet, decryptPrivateKey} from '../src/wallet';

describe('Wallet Service', () => {
  it('should generate wallet', () => {
    const wallet = generateAndEncryptWallet();
    expect(wallet.address).toMatch(/^0x[a-f0-9]{64}$/);
    expect(wallet.encryptedPrivateKey).toContain(':');
  });

  it('should encrypt and decrypt private key', () => {
    const wallet = generateAndEncryptWallet();
    const encrypted = wallet.encryptedPrivateKey;
    const decrypted = decryptPrivateKey(encrypted);
    expect(decrypted).toBeTruthy();
  });
});
```

```typescript
// backend/test/database.test.ts
import {createUser, getUserByEmail, initializeDatabase} from '../src/database';

describe('Database Service', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it('should create and retrieve user', async () => {
    const user = await createUser('test@example.com', '0x123', 'enc_key');
    const retrieved = await getUserByEmail('test@example.com');
    expect(retrieved.email).toBe('test@example.com');
  });
});
```

Run with:
```bash
npm install --save-dev jest ts-jest @types/jest
npm test
```

---

## Result: What Works Now

✅ **Fully testable right now:**
- Wallet generation (AES-256 encryption)
- Database schema creation
- Database CRUD operations
- Aptos client initialization
- Backend server startup

🟡 **Ready to implement:**
- User signup/login endpoints
- Project creation endpoint
- Split configuration management
- Payout batch orchestration

🔴 **Requires external setup:**
- Stripe webhook integration
- On-chain contract deployment
- OAuth provider setup (Google/Discord)

---

## Recommended Testing Order

**Day 1: Foundation**
1. Database setup ✅
2. Wallet generation ✅  
3. Backend server health ✅

**Day 2: API Implementation**
4. Implement signup endpoint
5. Implement project creation
6. Test with curl/Postman

**Day 3: Blockchain**
7. Deploy contracts to testnet
8. Implement on-chain calls
9. Test full flow

Let me know if you hit any issues!
