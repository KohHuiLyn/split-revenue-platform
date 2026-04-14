# Data Flow & Architecture Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                         │
│  - Project Creation Form                                         │
│  - Collaborator Management                                       │
│  - Approval & Sign-Off                                           │
│  - Revenue Tracking Dashboard                                    │
│  - Payout History                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ API Calls (HTTP)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                 BACKEND (Express.js/Node.js)                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API Modules                                              │  │
│  │  - projects.ts    (Epic 2,3: Create & Approve)          │  │
│  │  - splits.ts      (Epic 7: Rule Changes)                │  │
│  │  - payouts.ts     (Epic 4,5,6: Deposits & Distribution) │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Business Logic                                           │  │
│  │  - Validation (split %, authorizations)                 │  │
│  │  - Calculations (payouts, balances)                     │  │
│  │  - State Management (approvals, statuses)               │  │
│  │  - Audit Trail (transaction history)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Database Access                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ SQL Queries (PostgreSQL)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE (PostgreSQL)                        │
│  Tables:                                                         │
│  ├─ users                                                        │
│  ├─ projects                                                     │
│  ├─ project_collaborators                                        │
│  ├─ split_configs                                                │
│  ├─ payout_batches                                               │
│  ├─ payout_history                                               │
│  └─ [Future: Smart Contract Integration]                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Creating a Project

```
1. User Input
   ├─ Project Name: "Indie Game Launch"
   ├─ Description: "..."
   └─ Collaborators: [
        { email: "alice@...", percentage: 40 },
        { email: "bob@...", percentage: 35 },
        { email: "charlie@...", percentage: 25 }
      ]

2. Frontend Validation
   ├─ Check name not empty ✓
   ├─ Check descriptions valid ✓
   └─ Check total percentage = 100% ✓

3. API Request
   POST /api/projects
   Authorization: Bearer <token>
   Body: { project data }

4. Backend Processing
   a) Authenticate user (extract userId from token)
   b) Validate input (name, split percentages)
   c) Create project record (status: "pending_approval", is_active: false)
   d) Create initial split_config (version 0)
   e) Add creator as collaborator (role: "creator", status: "approved")
   f) Look up each collaborator by email
   g) Add collaborators (role: "contributor", status: "invited")

5. Database Writes
   INSERT INTO projects (...)
   INSERT INTO split_configs (...)
   INSERT INTO project_collaborators (creator) ...
   INSERT INTO project_collaborators (alice) ...
   INSERT INTO project_collaborators (bob) ...
   INSERT INTO project_collaborators (charlie) ...

6. Response
   {
     success: true,
     project: { id: 1, name: "Indie Game Launch", status: "pending_approval" },
     message: "Project created. Awaiting collaborator approval."
   }

7. User Experience
   ├─ Project appears in dashboard
   ├─ Status shows "Pending Approval"
   ├─ Shares sent to collaborators
   └─ Collaborators can now approve from their dashboard
```

---

## Data Flow: Collaborative Approval

```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T0: Creator creates project
    Alice ─┐
    Bob   ├─ invited → pending_approval
    Charlie┘
    
    Database State:
    ├─ projects.is_active = FALSE
    ├─ split_configs.is_active = FALSE
    └─ project_collaborators[all].status = "invited"

T1: Alice approves
    Alice ─ approved ✓
    Bob   ─ (pending)
    Charlie─ (pending)
    
    API Call: POST /api/projects/1/collaborators/2/approve
    
    Database Update:
    └─ project_collaborators[alice].status = "approved"
    └─ project_collaborators[alice].joined_at = NOW()
    
    Check: allApproved = false (only 1 of 3)

T2: Bob approves
    Alice ─ approved ✓
    Bob   ─ approved ✓
    Charlie─ (pending)
    
    Database Update:
    └─ project_collaborators[bob].status = "approved"
    
    Check: allApproved = false (only 2 of 3)

T3: Charlie approves
    Alice ─ approved ✓
    Bob   ─ approved ✓
    Charlie─ approved ✓
    
    Database Update:
    └─ project_collaborators[charlie].status = "approved"
    
    Check: allApproved = true ✓
    
    VAULT ACTIVATION:
    UPDATE projects SET is_active = TRUE WHERE id = 1
    UPDATE split_configs SET is_active = TRUE WHERE project_id = 1
    
    Response:
    {
      vaultActivated: true,
      message: "Vault activated!"
    }

T4: Vault is now ACTIVE
    All collaborators can now:
    ├─ Trigger distributions
    ├─ View transactions
    ├─ Propose rule changes
    └─ Receive payouts
```

---

## Data Flow: Revenue Distribution

```
Scenario: Vault has $3,240 pending distribution

1. Any Collaborator Triggers Distribution
   POST /api/projects/1/distribute
   
2. Backend Process:
   a) Verify user is collaborator ✓
   b) Calculate vault balance:
      Total Deposited: $45,820
      Total Paid Out:  $42,580
      Pending:         $3,240 ← This gets distributed
   
   c) Get collaborators & percentages:
      - Alice:   40% 
      - Bob:     35%
      - Charlie: 25%
   
   d) Calculate payout amounts:
      - Alice:   $3,240 × 40% = $1,296
      - Bob:     $3,240 × 35% = $1,134
      - Charlie: $3,240 × 25% = $810
   
   e) Create payout batch:
      INSERT INTO payout_batches (
        project_id: 1,
        total_amount_usdc_micro: 3240000000,
        num_recipients: 3,
        status: 'executed'
      )
      → Returns batch_id: 5
   
   f) Create individual payouts:
      INSERT INTO payout_history
      ├─ recipient_id: Alice (2), amount: 1296000000, status: 'success'
      ├─ recipient_id: Bob (3),   amount: 1134000000, status: 'success'
      └─ recipient_id: Charlie(4), amount: 810000000, status: 'success'

3. Database State After:
   
   payout_batches (NEW):
   ├─ batch#5: $3,240 ✓ executed
   
   payout_history (NEW):
   ├─ record#15: alice got $1,296 ✓
   ├─ record#16: bob got $1,134 ✓
   └─ record#17: charlie got $810 ✓
   
   projects:
   └─ VAULT BALANCE IS NOW: $0 (all distributed)

4. Response:
   {
     success: true,
     distribution: {
       batchId: 5,
       totalAmount: 3240.00,
       payouts: [
         { recipient: "Alice", amount: 1296 },
         { recipient: "Bob", amount: 1134 },
         { recipient: "Charlie", amount: 810 }
       ]
     }
   }

5. Collaborators See in Dashboard:
   ├─ Alice:   +$1,296 earned (total: $18,328)
   ├─ Bob:     +$1,134 earned (total: $16,037)
   └─ Charlie: +$810 earned (total: $11,455)
```

---

## Data Model Relationships

```
USERS (1:M) PROJECTS
├─ Creator has many projects
└─ Einstein: "Genius is recognizing patterns"

PROJECTS (1:M) PROJECT_COLLABORATORS
├─ Project has many collaborators
├─ Each collaborator has a:
│  ├─ split_percentage (0-100)
│  ├─ status (invited/approved/removed)
│  └─ role (creator/contributor/editor)
└─ Invariant: sum(split_percentage) = 100%

PROJECTS (1:M) SPLIT_CONFIGS
├─ Project has many split configurations (versioned)
├─ Only ONE can be is_active = TRUE at a time
├─ Tracks history of ALL changes
└─ Can revert by activating old config

PROJECTS (1:M) PAYOUT_BATCHES
├─ Group related payouts together
├─ Reduces gas costs on-chain
├─ Track total deposited per batch
└─ Status: pending → executed

PAYOUT_BATCHES (1:M) PAYOUT_HISTORY
├─ Individual payouts to users
├─ Each collaborator gets their share
├─ Records transaction hash (on-chain)
└─ Status: pending → success → failed

USERS (1:M) PAYOUT_HISTORY
└─ Each user receives many payouts
```

---

## Key Calculations

### Vault Balance
```
Vault Balance = Total Deposits - Total Distributions
              = SUM(payout_batches.total_amount) 
                - SUM(payout_history[status='success'].amount)
```

### Expected Shares
```
For each collaborator:
  Expected Share = Vault Balance × (split_percentage / 100)
  
Example with vault balance $3,240:
  Alice (40%):   $3,240 × 0.40 = $1,296
  Bob (35%):     $3,240 × 0.35 = $1,134
  Charlie (25%): $3,240 × 0.25 = $810
  ─────────────────────────────────────
  Total:                           $3,240 ✓
```

### Total Earned
```
For each collaborator:
  Total Earned = SUM(payout_history[recipient_id=user, status='success'].amount)
```

---

## Status Progressions

### Project Status
```
Created → Pending Approval → Active
          (awaits all         (can receive
          collaborators       deposits &
          to approve)         distribute)
```

### Collaborator Status
```
Invited → Approved ✓
          (only after user
          explicitly approves)
```

### Payout Status
```
Pending → Success ✓
         (distributed to wallet)
```

### Batch Status
```
Pending → Executed ✓
         (funds distributed to recipients)
```

---

## Transaction Types

### Deposits
- Source: Revenue (manually recorded)
- Creates: payout_batch
- Effect: Increases vault balance
- Visibility: All collaborators

### Distributions
- Trigger: Any collaborator
- Creates: payout_history records
- Effect: Decreases vault balance by distributed amount
- Visibility: All collaborators

### Configuration Changes
- Proposed by: Any collaborator
- Creates: New split_config
- Requires: All collaborator approval (future: configurable)
- Effect: Changes future payout percentages

---

## Error Prevention

### Split Validation
```
if (percentages.sum() !== 100) {
  return error: "Must total 100%"
}
```

### Authorization
```
if (project.creator_id !== userId && 
    !project_collaborators[userId]) {
  return error: "Not a collaborator"
}
```

### State Checks
```
if (!project.is_active) {
  return error: "Vault not active yet"
}

if (vault_balance <= 0) {
  return error: "No funds to distribute"
}
```

---

## Future: Smart Contract Integration

```
Current (Centralized):
  Frontend → Node.js API → PostgreSQL
  
Future (Web3):
  Frontend → Node.js API ← → Smart Contract
                  ↓
              PostgreSQL (off-chain data)
              
On-Chain Data:
├─ wallet_addresses
├─ split_percentages
├─ payout_rules
└─ transaction history

Off-Chain Data:
├─ project metadata
├─ legal documents
├─ user profiles
└─ dispute evidence
```

---
