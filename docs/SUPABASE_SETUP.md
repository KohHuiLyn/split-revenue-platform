# Using Supabase Instead of Local PostgreSQL

## What is Supabase?

Supabase is a managed PostgreSQL hosting service with:
- ✅ **Free tier** (perfect for development)
- ✅ **Same PostgreSQL** (100% compatible with our schema)
- ✅ **Cloud hosted** (no local setup needed)
- ✅ **Built-in UI** for querying/managing data
- ✅ **Real-time subscriptions** (bonus feature)
- ✅ **Auth system** (optional, we're implementing our own)

**Key benefit:** No need to install/run PostgreSQL locally. Perfect for teams.

---

## Quick Setup (5 minutes)

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub/Google/email
4. Create a new project:
   - **Name:** `split-revenue-db`
   - **Password:** Generate strong password (copy it!)
   - **Region:** Choose closest to you
   - Click "Create new project"

### Step 2: Load Database Schema

Once project is created:

1. Go to SQL Editor (left sidebar)
2. Click "New Query"
3. Copy entire contents of `database/schema.sql`
4. Paste into the query editor
5. Click "Run"

✅ All 10 tables created!

### Step 3: Get Connection String

In Supabase, go to **Settings → Database → Connection String**

Choose "Connection pooling":
```
postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres
```

Copy the entire string (replace `[PASSWORD]` with your actual password)

### Step 4: Update Backend .env

```bash
cd backend

# Edit .env (or create if doesn't exist)
cat > .env << 'EOF'
# Use Supabase connection string instead of local
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[REGION].supabase.co:6543/postgres

# Rest stays the same
APTOS_NODE_URL=https://testnet.api.aptos.dev/v1
APTOS_MODULE_ADDRESS=0x1
PORT=3000
WALLET_ENCRYPTION_KEY=your-secure-key-32-chars-minimum
EOF
```

### Step 5: Test Connection

```bash
npm run dev

# Expected output:
# ✅ Database connected successfully (Supabase!)
# ✅ Server running on port 3000
```

---

## Local vs Supabase - Comparison

| Feature | Local PostgreSQL | Supabase |
|---------|------------------|----------|
| **Setup Time** | 10 min | 3 min |
| **Cost** | Free (hardware) | Free tier (up to 500MB) |
| **Maintenance** | You manage | Managed for you |
| **Backups** | Manual | Automatic daily |
| **Team Access** | Share credentials | Built-in team sharing |
| **Real-time API** | No | Yes (bonus!) |
| **Authentication** | Build custom | Built-in (optional) |
| **Performance** | Fast local | Depends on region |
| **Data Security** | Your network | Enterprise-grade |

---

## Supabase Admin Features

Once connected, you get a nice UI:

### View Data
```
Project → Tables → users/projects/purchases
- See all records
- Filter, sort, search
- Download as CSV
```

### Run Queries
```
Project → SQL Editor
- Write SQL queries
- See results immediately
- Excellent for debugging
```

### Monitor Performance
```
Project → Database → Logs
- See which queries are slow
- Query times
- Connection stats
```

### Automated Backups
```
Project → Settings → Backups
- Daily automatic backups
- Point-in-time recovery
- 14-day retention (free tier)
```

---

## Connection String Explained

Supabase gives you:
```
postgresql://postgres:YOUR_PASSWORD@db.REGION.supabase.co:6543/postgres
                     ^             ^   ^^^^^                   ^^^^
                     |             |   |                       |
                  Password    Hostname Region            Database name
```

Breaking it down:
- **User:** `postgres` (default)
- **Password:** Your project password
- **Host:** `db.{region}.supabase.co` (e.g., `db.abc123xyz.supabase.co`)
- **Port:** `6543` (Supabase connection pooling)
- **Database:** `postgres` (default)

### Connection Pooling vs Direct Connection

Supabase offers two:

**Connection Pooling (recommended):**
```
postgresql://postgres:pwd@db.xyz.supabase.co:6543/postgres
```
- ✅ Better for many connections
- ✅ Reuses connections
- ✅ Perfect for backend services

**Direct Connection:**
```
postgresql://postgres:pwd@db.xyz.supabase.co:5432/postgres
```
- ✅ If you need specific features
- ❌ More connections = higher cost
- ❌ Not recommended for production

Use **connection pooling** (port 6543).

---

## Free Tier Limits

| Resource | Free Tier Limit | Notes |
|----------|-----------------|-------|
| **Storage** | 500 MB | More than enough for dev |
| **Bandwidth** | 2 GB/month | Very generous |
| **Connections** | 60 | Plenty for small team |
| **Backups** | 7 days | Automatic daily |
| **Uptime SLA** | No SLA | Good enough for dev |

For your app:
- ✅ 10 tables → < 1 MB
- ✅ 1000 users → < 10 MB
- ✅ 10,000 purchases → < 50 MB
- **Total:** Well under 500 MB

---

## Troubleshooting Supabase

### Issue: "Connection refused"
```bash
# Check you copied the connection string correctly
echo $DATABASE_URL

# Verify password is correct (special chars need escaping)
# Example: password@123 → password%40123
```

### Issue: "SSL ERROR"
```bash
# Supabase requires SSL by default
# Already handled in our postgres library (ssl: true in connection)
# Or add to connection string:
# ?sslmode=require
```

### Issue: "Too many connections"
```bash
# Free tier has 60 connection limit
# Our code uses connection pooling (6543)
# Should handle this automatically
# If you deploy multiple instances, might hit limit
# Solution: Upgrade to paid tier or reduce instances
```

### Issue: "Database quota exceeded"
```bash
# You've hit 500 MB storage limit
# Solutions:
# 1. Delete old test data
# 2. Export and use local DB
# 3. Upgrade to paid tier ($25/month = 8 GB)
```

---

## Team Collaboration with Supabase

### Invite Team Members

1. Project → Settings → Members
2. Enter email address
3. Choose role:
   - **Owner:** Full access, can delete project
   - **Developer:** Create/modify tables, queries
   - **Viewer:** Read-only database queries

### Shared Environment Variables

Store connection string in shared location:
- GitHub Secrets (for CI/CD)
- Team password manager
- .env file (git-ignored locally)

### No Username/Password Sharing

With Supabase project sharing, each team member uses their own account. No sharing credentials!

---

## Migration: Local → Supabase

If you start with local PostgreSQL and want to move to Supabase:

### Option 1: Export & Import (5 minutes)

```bash
# Export from local
pg_dump split_revenue_db > backup.sql

# Import to Supabase (via Supabase UI)
# SQL Editor → New Query → Paste backup.sql → Run
```

### Option 2: Use Supabase CLI

```bash
# Install
npm install -g supabase

# Login
supabase login

# Push current database state to Supabase
supabase db push
```

---

## Production Deployment Path

### Development (Now)
- ✅ Free Supabase ($0)
- ✅ 500 MB storage
- ✅ Full PostgreSQL
- ✅ Automatic backups

### Beta Testing (When ready)
- ✅ Free Supabase tier (still!)
- Monitor usage
- No code changes needed

### Production (Launch)
**Upgrade options:**
1. **Pro Plan** ($25/month)
   - 8 GB storage
   - Unlimited connections
   - Custom domain support
   - Priority support

2. **Self-hosted** (Advanced)
   - Host in AWS/GCP/DigitalOcean
   - Full control
   - Pay only for compute

3. **Managed Supabase** (Enterprise)
   - Custom features
   - SSO integration
   - Dedicated support

For a startup MVP, **Pro Plan** ($25/month) is perfect.

---

## Supabase + Aptos Workflow

Your complete stack becomes:

```
┌─────────────────┐
│   React App     │
│   (Local dev)   │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Node.js Backend (Local)         │
│  ├─ User auth                    │
│  ├─ Wallet management            │
│  └─ Smart contract calls         │
└──────────────────────────────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
    ┌─────────┐            ┌──────────────┐
    │ Supabase│            │ Aptos (chain)│
    │(off-    │            │ (on-chain)   │
    │ chain)  │            │              │
    └─────────┘            └──────────────┘
```

**Benefits:**
- No local PostgreSQL needed
- Automatic backups of off-chain data
- Scalable to production
- Team can access data from anywhere

---

## Quick Reference

### Change from Local → Supabase

That's literally it! Just change one line:

```diff
# .env.example (OLD - Local PostgreSQL)
- DATABASE_URL=postgres://postgres:postgres@localhost:5432/split_revenue_db

# .env (NEW - Supabase)
+ DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REGION].supabase.co:6543/postgres
```

All other code stays the same. The database API is identical.

---

## Recommended Setup

For your project, I recommend:

### During Development
- ✅ **Use Supabase Free**
- ✅ No local setup needed
- ✅ Team can access same DB
- ✅ 500 MB is plenty for dev

### Before Beta Testing
- ✅ **Stay on Free tier**
- ✅ Monitor storage usage
- ✅ Keep costs at $0

### At Production
- ✅ **Upgrade to Pro** ($25/month)
- ✅ 8 GB storage
- ✅ Unlimited connections
- ✅ Still fully managed

---

## Next Steps

1. **Sign up for Supabase** (free, 2 min)
2. **Create project** (1 min)
3. **Load schema** via SQL Editor (30 sec)
4. **Get connection string** (1 min)
5. **Update .env** (1 min)
6. **Test:** `npm run dev` ✅

**Total time: 5 minutes**

Then you can start building from day 1, no database setup needed!

Want me to create a step-by-step visual guide?
