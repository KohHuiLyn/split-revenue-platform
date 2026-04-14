# Split Revenue Platform - Complete API Documentation

## Overview
This document outlines all API endpoints for the Split Revenue Platform, organized by Epic and Story from the product backlog.

**Base URL:** `http://localhost:3000/api`

**Authentication:** All endpoints (except `/auth`) require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## EPIC 1: Web2-Style Onboarding
*Authentication and wallet management - handled separately*

---

## EPIC 2: Project Vault Creation

### Story 2.1 - Create Revenue Vault
**POST** `/projects`

Creates a new revenue-sharing vault with collaborators.

**Request:**
```json
{
  "name": "Indie Game Launch",
  "description": "Revenue splits for our indie game Steam release",
  "priceUsdcMicro": 0,
  "collaborators": [
    { "email": "alice@example.com", "splitPercentage": 40 },
    { "email": "bob@example.com", "splitPercentage": 35 },
    { "email": "charlie@example.com", "splitPercentage": 25 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": 1,
    "name": "Indie Game Launch",
    "description": "...",
    "creatorId": 1,
    "status": "pending_approval",
    "createdAt": "2026-04-14T..."
  },
  "message": "Project created. Awaiting collaborator approval."
}
```

---

### Story 2.1 - Get All User Projects
**GET** `/projects`

Get all projects for authenticated user (as creator or collaborator).

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Indie Game Launch",
      "description": "...",
      "creatorName": "Alice",
      "status": "pending_approval",
      "collaboratorCount": 3,
      "priceUsd": "0.00",
      "createdAt": "2026-04-14T..."
    }
  ]
}
```

---

### Story 2.1 - Get Project Details
**GET** `/projects/:id`

Get detailed information about a specific project.

**Response:**
```json
{
  "id": 1,
  "name": "Indie Game Launch",
  "description": "...",
  "status": "active",
  "vaultBalance": 3240.00,
  "totalRevenue": 45820.00,
  "collaborators": [
    {
      "id": 1,
      "email": "alice@example.com",
      "name": "Alice Chen",
      "walletAddress": "0x123...",
      "percentage": 40,
      "earned": 18328.00,
      "status": "approved",
      "joinedAt": "2026-04-14T..."
    }
  ],
  "recentTransactions": [
    {
      "type": "deposit",
      "amount": 1240.00,
      "date": "2026-04-12T...",
      "from": "Revenue",
      "txHash": "0x742d35..."
    }
  ],
  "contractAddress": "0x742d35Cc6634C0532925a...",
  "network": "Aptos Mainnet",
  "lastDistribution": "N/A"
}
```

---

### Story 2.1 - Update Project
**PUT** `/projects/:id`

Update project details (name, description, price).

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "priceUsdcMicro": 1000000
}
```

---

### Story 2.1 - Delete Project
**DELETE** `/projects/:id`

Delete a project (only if not active).

---

### Story 2.2 - Get Collaborators
**GET** `/projects/:id/collaborators`

Get list of project collaborators.

**Response:**
```json
{
  "collaborators": [
    {
      "id": 1,
      "collaboratorId": 2,
      "email": "alice@example.com",
      "name": "Alice Chen",
      "walletAddress": "0x123...",
      "role": "contributor",
      "status": "invited",
      "splitPercentage": 40,
      "joinedAt": null,
      "createdAt": "2026-04-14T..."
    }
  ]
}
```

---

### Story 2.2 - Add Collaborator
**POST** `/projects/:id/collaborators`

Add a collaborator to an existing project.

**Request:**
```json
{
  "email": "new@example.com",
  "splitPercentage": 20
}
```

---

### Story 2.2 - Remove Collaborator
**DELETE** `/projects/:id/collaborators/:collaboratorId`

Remove a collaborator from a project.

---

---

## EPIC 3: Collaborator Approval

### Story 3.1 - Review Vault Terms
**GET** `/projects/:id/splits/current`

Get the current active split configuration for a vault.

**Response:**
```json
{
  "id": 1,
  "projectId": 1,
  "configVersion": 0,
  "configData": {
    "collaborators": ["alice@example.com", "bob@example.com"],
    "percentages": [40, 35, 25]
  },
  "isActive": true,
  "createdBy": 1,
  "createdAt": "2026-04-14T..."
}
```

---

### Story 3.2 - Approve Vault
**POST** `/projects/:id/collaborators/:collaboratorId/approve`

Collaborator approves the vault terms.

**Response:**
```json
{
  "success": true,
  "collaborator": { ... },
  "vaultActivated": false,
  "message": "Approval recorded. Awaiting other approvals."
}
```

When all collaborators approve:
```json
{
  "success": true,
  "vaultActivated": true,
  "message": "Vault activated!"
}
```

---

### Story 3.3 - Track Approval Status
**GET** `/projects/:id/approval-status`

Get the approval status of all collaborators.

**Response:**
```json
{
  "projectId": 1,
  "approvals": [
    {
      "id": 2,
      "email": "alice@example.com",
      "name": "Alice",
      "status": "approved",
      "splitPercentage": 40,
      "approvedAt": "2026-04-14T..."
    },
    {
      "id": 3,
      "email": "bob@example.com",
      "name": "Bob",
      "status": "invited",
      "splitPercentage": 35,
      "approvedAt": null
    }
  ],
  "allApproved": false,
  "totalApprovals": 2,
  "approvedCount": 1
}
```

---

---

## EPIC 4: Revenue Deposits

### Story 4.1 - Deposit Revenue
**POST** `/projects/:id/deposits`

Record a revenue deposit into the vault.

**Request:**
```json
{
  "amount_usdc_micro": 1240000000,
  "source": "Steam Revenue"
}
```

**Response:**
```json
{
  "success": true,
  "batch": {
    "id": 1,
    "projectId": 1,
    "amount": 1240.00,
    "source": "Steam Revenue",
    "status": "executed",
    "createdAt": "2026-04-14T..."
  },
  "message": "Deposit recorded"
}
```

---

### Story 4.2 - View Vault Balance
**GET** `/projects/:id/vault-balance`

Get current vault balance and deposit summary.

**Response:**
```json
{
  "projectId": 1,
  "vaultBalance": 3240.00,
  "totalDeposited": 45820.00,
  "totalDistributed": 42580.00,
  "pendingDistribution": 0.00
}
```

---

### Story 4.3 - View Expected Shares
**GET** `/projects/:id/expected-shares`

See how much each collaborator should receive based on current vault balance.

**Response:**
```json
{
  "projectId": 1,
  "vaultBalance": 3240.00,
  "expectedShares": [
    {
      "collaboratorId": 2,
      "email": "alice@example.com",
      "name": "Alice",
      "percentage": 40,
      "expectedAmount": 1296.00,
      "totalEarned": 18328.00
    },
    {
      "collaboratorId": 3,
      "email": "bob@example.com",
      "name": "Bob",
      "percentage": 35,
      "expectedAmount": 1134.00,
      "totalEarned": 16037.00
    }
  ]
}
```

---

### Story 4.1 - View Deposit History
**GET** `/projects/:id/deposits`

Get history of all deposits.

**Response:**
```json
{
  "projectId": 1,
  "deposits": [
    {
      "id": 1,
      "amount": 1240.00,
      "status": "executed",
      "date": "2026-04-12T..."
    },
    {
      "id": 2,
      "amount": 2000.00,
      "status": "executed",
      "date": "2026-04-09T..."
    }
  ]
}
```

---

---

## EPIC 5: Revenue Distribution

### Story 5.1/5.2/5.3 - Trigger Distribution
**POST** `/projects/:id/distribute`

Trigger payout distribution to all collaborators.

**Response:**
```json
{
  "success": true,
  "distribution": {
    "batchId": 5,
    "totalAmount": 3240.00,
    "recipientCount": 3,
    "payouts": [
      {
        "recipientId": 2,
        "walletAddress": "0xabc...",
        "amount": 1296.00,
        "percentage": 40
      },
      {
        "recipientId": 3,
        "walletAddress": "0xdef...",
        "amount": 1134.00,
        "percentage": 35
      }
    ],
    "status": "completed",
    "executedAt": "2026-04-14T..."
  },
  "message": "Revenue distributed successfully"
}
```

---

---

## EPIC 6: Transparency & History

### Story 6.1 - View Deposit History
*(See EPIC 4, Story 4.1 - View Deposit History)*

---

### Story 6.2 - View Payout History
**GET** `/payouts/history?limit=50&offset=0`

Get payout history for authenticated user (recipient or project creator).

**Response:**
```json
{
  "payouts": [
    {
      "id": 1,
      "batchId": 5,
      "projectId": 1,
      "projectName": "Indie Game Launch",
      "recipientName": "Alice",
      "recipientEmail": "alice@example.com",
      "amount": 1296.00,
      "status": "success",
      "txHash": "0x742d35...",
      "createdAt": "2026-04-14T..."
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

---

### Story 6.3 - Show Transaction Links
**GET** `/projects/:id/transactions?limit=50`

Get combined transaction history (deposits + payouts).

**Response:**
```json
{
  "projectId": 1,
  "transactions": [
    {
      "id": 5,
      "type": "payout",
      "amount": 1296.00,
      "date": "2026-04-14T...",
      "status": "success",
      "txHash": "0x742d35...",
      "from": "alice@example.com"
    },
    {
      "id": 4,
      "type": "deposit",
      "amount": 3240.00,
      "date": "2026-04-12T...",
      "status": "executed",
      "txHash": "0x5c9b44...",
      "from": "Revenue"
    }
  ]
}
```

---

### Story 6.2 - Get Payout Batch Details
**GET** `/payouts/batch/:batchId`

Get detailed information about a specific payout batch.

**Response:**
```json
{
  "batch": {
    "id": 5,
    "projectId": 1,
    "totalAmount": 3240.00,
    "recipientCount": 3,
    "status": "executed",
    "createdAt": "2026-04-14T...",
    "executedAt": "2026-04-14T..."
  },
  "payouts": [
    {
      "id": 15,
      "recipientId": 2,
      "email": "alice@example.com",
      "name": "Alice",
      "walletAddress": "0xabc...",
      "amount": 1296.00,
      "status": "success",
      "txHash": "0x742d35...",
      "createdAt": "2026-04-14T..."
    }
  ]
}
```

---

---

## EPIC 7: Rule Change Governance

### Story 7.1 - Propose Split Change
**POST** `/projects/:id/splits/propose`

Propose a new split configuration.

**Request:**
```json
{
  "collaborators": ["alice@example.com", "bob@example.com"],
  "percentages": [50, 50]
}
```

**Response:**
```json
{
  "success": true,
  "proposal": {
    "id": 2,
    "status": "pending_approval",
    "collaborators": ["alice@example.com", "bob@example.com"],
    "percentages": [50, 50],
    "createdAt": "2026-04-14T..."
  },
  "message": "Split change proposed. Awaiting collaborator approvals."
}
```

---

### Story 7.2 - Vote on Changes
### Story 7.3 - Apply Approved Changes
**POST** `/projects/:id/splits/:configId/approve`

Approve and apply a proposed split change.

**Response:**
```json
{
  "success": true,
  "config": { ... },
  "message": "Split configuration activated"
}
```

---

### Story 7.1 - View Split Change History
**GET** `/projects/:id/splits/history`

Get history of all split configuration changes.

**Response:**
```json
{
  "projectId": 1,
  "history": [
    {
      "id": 2,
      "version": 1,
      "configData": {
        "collaborators": ["alice@...", "bob@..."],
        "percentages": [50, 50]
      },
      "isActive": true,
      "createdByName": "Alice",
      "createdAt": "2026-04-14T...",
      "updatedAt": "2026-04-14T..."
    },
    {
      "id": 1,
      "version": 0,
      "configData": {
        "collaborators": [...],
        "percentages": [40, 35, 25]
      },
      "isActive": false,
      "createdByName": "Alice",
      "createdAt": "2026-04-13T..."
    }
  ]
}
```

---

### Story 7.4 - Reject Unauthorized Changes
**POST** `/projects/:id/splits/:configId/reject`

Reject a pending split configuration.

**Response:**
```json
{
  "success": true,
  "message": "Split configuration rejected"
}
```

---

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "error": "Error description"
}
```

Common HTTP Status Codes:
- `200 OK` - Success
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Frontend Integration

The frontend `api.ts` file provides organized access to all endpoints:

```typescript
import { api } from '@/lib/api';

// Projects
await api.projects.create(projectData);
await api.projects.getAll();
await api.projects.getById(id);
await api.projects.update(id, updateData);
await api.projects.delete(id);

// Collaborators
await api.projects.getApprovalStatus(projectId);
await api.projects.approveVault(projectId, collaboratorId);
await api.projects.getCollaborators(projectId);
await api.projects.addCollaborator(projectId, data);
await api.projects.removeCollaborator(projectId, collaboratorId);

// Splits
await api.splits.getCurrent(projectId);
await api.splits.getHistory(projectId);
await api.splits.propose(projectId, data);
await api.splits.approve(projectId, configId);
await api.splits.reject(projectId, configId);

// Revenue
await api.revenue.getVaultBalance(projectId);
await api.revenue.getExpectedShares(projectId);
await api.revenue.recordDeposit(projectId, data);
await api.revenue.getDepositHistory(projectId);

// Payouts
await api.payouts.distribute(projectId);
await api.payouts.getHistory(limit, offset);
await api.payouts.getBatch(batchId);
await api.payouts.getTransactions(projectId, limit);
```

---
