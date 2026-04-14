import postgres from "postgres";

/**
 * Database Service
 * Handles all database operations
 */

let db: postgres.Sql;

export async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL || 
    `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  db = postgres(connectionString);

  // Test connection
  try {
    await db`SELECT 1`;
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

/**
 * User operations
 */
export async function createUser(
  email: string,
  walletAddress: string,
  encryptedPrivateKey: string,
  display_name: string,
  oauthId?: string
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO users (email, oauth_id, wallet_address, wallet_private_key_encrypted, display_name)
    VALUES (${email}, ${oauthId || null}, ${walletAddress}, ${encryptedPrivateKey}, ${display_name})
    RETURNING id, email, wallet_address, display_name, created_at
  `;
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT id, email, wallet_address, wallet_private_key_encrypted, display_name, created_at
    FROM users
    WHERE LOWER(email) = LOWER(${email})
  `;
  return result[0] || null;
}

/**
 * Search users by email (partial match)
 */
export async function searchUsersByEmail(emailQuery: string) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT id, email, display_name
    FROM users
    WHERE LOWER(email) LIKE ${'%' + emailQuery.toLowerCase() + '%'}
    LIMIT 10
  `;
  return result;
}

export async function getUserByWalletAddress(walletAddress: string) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT id, email, wallet_address, display_name, created_at
    FROM users
    WHERE wallet_address = ${walletAddress}
  `;
  return result[0] || null;
}

/**
 * Project operations
 */
export async function createProject(
  creatorId: number,
  name: string,
  description: string,
  priceUsdcMicro: number,
  coverImageUrl?: string
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO projects (creator_id, name, description, price_usdc_micro, cover_image_url)
    VALUES (${creatorId}, ${name}, ${description}, ${priceUsdcMicro}, ${coverImageUrl || null})
    RETURNING id, name, price_display_usd, created_at
  `;
  return result[0];
}

export async function updateProjectOnChainId(projectId: number, onChainId: bigint) {
  const db_instance = getDb();
  const result = await db_instance`
    UPDATE projects
    SET on_chain_id = ${onChainId}
    WHERE id = ${projectId}
    RETURNING id, on_chain_id
  `;
  return result[0];
}

export async function getProject(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT id, name, description, price_usdc_micro, price_display_usd, is_active, created_at
    FROM projects
    WHERE id = ${projectId}
  `;
  return result[0] || null;
}

export async function getProjectsByUserId(userId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT DISTINCT p.id, p.name, p.description, p.price_display_usd, p.is_active, p.created_at
    FROM projects p
    LEFT JOIN project_collaborators pc ON pc.project_id = p.id AND pc.status = 'accepted'
    WHERE p.creator_id = ${userId} OR pc.collaborator_id = ${userId}
    ORDER BY p.created_at DESC
  `;
  return result;
}

/**
 * Collaborator operations
 */
export async function addCollaborator(
  projectId: number,
  collaboratorId: number,
  role: string = "contributor",
  splitPercentage: number = 0
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO project_collaborators (project_id, collaborator_id, role, split_percentage, status)
    VALUES (${projectId}, ${collaboratorId}, ${role}, ${splitPercentage}, 'accepted')
    RETURNING id, role, split_percentage
  `;
  return result[0];
}

export async function getProjectCollaborators(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      pc.collaborator_id,
      u.wallet_address,
      u.email,
      pc.role,
      pc.split_percentage
    FROM project_collaborators pc
    JOIN users u ON pc.collaborator_id = u.id
    WHERE pc.project_id = ${projectId} AND pc.status = 'accepted'
  `;
  return result;
}

/**
 * Purchase operations
 */
export async function createPurchase(
  projectId: number,
  customerEmail: string,
  amountUsdcMicro: number,
  paymentMethod: string = "credit_card"
) {
  const db_instance = getDb();

  // Get or create customer
  let customer = await db_instance`
    SELECT id FROM customers WHERE email = ${customerEmail}
  `;

  if (!customer.length) {
    customer = await db_instance`
      INSERT INTO customers (email)
      VALUES (${customerEmail})
      RETURNING id
    `;
  }

  const customerId = customer[0].id;

  // Create purchase
  const result = await db_instance`
    INSERT INTO purchases (project_id, customer_id, amount_usdc_micro, payment_method, status)
    VALUES (${projectId}, ${customerId}, ${amountUsdcMicro}, ${paymentMethod}, 'pending')
    RETURNING id, amount_display_usd, created_at
  `;
  return result[0];
}

export async function updatePurchaseStatus(purchaseId: number, status: string) {
  const db_instance = getDb();
  const result = await db_instance`
    UPDATE purchases
    SET status = ${status}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${purchaseId}
    RETURNING id, status
  `;
  return result[0];
}

/**
 * Payout operations
 */
export async function createPayoutBatch(
  projectId: number,
  totalAmountUsdcMicro: number,
  numRecipients: number
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO payout_batches (project_id, total_amount_usdc_micro, num_recipients, status)
    VALUES (${projectId}, ${totalAmountUsdcMicro}, ${numRecipients}, 'pending')
    RETURNING id, total_amount_display_usd, created_at
  `;
  return result[0];
}

export async function updatePayoutBatchStatus(batchId: number, status: string, onChainBatchId?: number) {
  const db_instance = getDb();
  const result = await db_instance`
    UPDATE payout_batches
    SET status = ${status}, 
        on_chain_batch_id = ${onChainBatchId || null},
        executed_at = CASE WHEN ${status} = 'executed' THEN CURRENT_TIMESTAMP ELSE executed_at END
    WHERE id = ${batchId}
    RETURNING id, status
  `;
  return result[0];
}

export async function createPayoutHistory(
  batchId: number,
  projectId: number,
  recipientId: number,
  amountUsdcMicro: number,
  onChainRecordId?: bigint
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO payout_history (batch_id, project_id, recipient_id, amount_usdc_micro, on_chain_record_id, status)
    VALUES (${batchId}, ${projectId}, ${recipientId}, ${amountUsdcMicro}, ${onChainRecordId || null}, 'pending')
    RETURNING id, amount_display_usd
  `;
  return result[0];
}

export async function getPayoutHistoryForRecipient(recipientId: number, limit: number = 50, offset: number = 0) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      ph.id,
      pb.id as batch_id,
      p.name as project_name,
      ph.amount_display_usd,
      ph.status,
      ph.created_at
    FROM payout_history ph
    JOIN payout_batches pb ON ph.batch_id = pb.id
    JOIN projects p ON ph.project_id = p.id
    WHERE ph.recipient_id = ${recipientId}
    ORDER BY ph.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return result;
}

/**
 * Project operations - Extended
 */
export async function getAllProjectsForUser(userId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      p.*,
      u.display_name as creator_name,
      u.email as creator_email,
      (SELECT COUNT(*) FROM project_collaborators WHERE project_id = p.id) as collaborator_count,
      COALESCE((SELECT SUM(total_amount_usdc_micro) FROM payout_batches WHERE project_id = p.id AND status = 'executed'), 0) as total_deposited_micro,
      COALESCE((SELECT SUM(amount_usdc_micro) FROM payout_history WHERE project_id = p.id AND status = 'success'), 0) as total_distributed_micro
    FROM projects p
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE p.creator_id = ${userId} OR p.id IN (
      SELECT project_id FROM project_collaborators WHERE collaborator_id = ${userId}
    )
    ORDER BY p.created_at DESC
  `;
  return result;
}

export async function getProjectDetails(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT *
    FROM projects
    WHERE id = ${projectId}
  `;
  return result[0] || null;
}

export async function getProjectWithCollaborators(projectId: number) {
  const db_instance = getDb();
  const projectResult = await db_instance`
    SELECT * FROM projects WHERE id = ${projectId}
  `;
  
  if (!projectResult.length) return null;

  const collabResult = await db_instance`
    SELECT 
      pc.id, 
      pc.split_percentage, 
      pc.status, 
      pc.joined_at,
      u.id as user_id,
      u.email, 
      u.display_name as name,
      u.wallet_address,
      COALESCE((SELECT SUM(amount_usdc_micro) FROM payout_history WHERE recipient_id = u.id AND project_id = ${projectId} AND status = 'success'), 0) as earned_micro
    FROM project_collaborators pc
    LEFT JOIN users u ON pc.collaborator_id = u.id
    WHERE pc.project_id = ${projectId}
    ORDER BY pc.created_at ASC
  `;

  return {
    project: projectResult[0],
    collaborators: collabResult,
  };
}

export async function updateProjectDetails(projectId: number, name: string, description: string, priceUsdcMicro: number) {
  const db_instance = getDb();
  const result = await db_instance`
    UPDATE projects 
    SET name = ${name}, 
        description = ${description},
        price_usdc_micro = ${priceUsdcMicro},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${projectId}
    RETURNING *
  `;
  return result[0] || null;
}

export async function deleteProject(projectId: number) {
  const db_instance = getDb();
  await db_instance`DELETE FROM projects WHERE id = ${projectId}`;
}

export async function activateProject(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    UPDATE projects SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = ${projectId}
    RETURNING *
  `;
  return result[0] || null;
}

/**
 * Project Collaborators operations
 */
export async function addProjectCollaborator(
  projectId: number,
  collaboratorId: number | null,
  email: string | null,
  role: string,
  status: string,
  splitPercentage: number
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO project_collaborators (project_id, collaborator_id, role, status, split_percentage)
    VALUES (${projectId}, ${collaboratorId || null}, ${role}, ${status}, ${splitPercentage})
    ON CONFLICT (project_id, collaborator_id) DO UPDATE
    SET split_percentage = ${splitPercentage}, status = ${status}
    RETURNING *
  `;
  return result[0];
}

export async function getProjectCollaboratorsDetail(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      pc.id,
      pc.collaborator_id,
      u.email,
      u.display_name as name,
      u.wallet_address,
      pc.role,
      pc.status,
      pc.split_percentage,
      pc.joined_at,
      pc.created_at,
      COALESCE((SELECT SUM(amount_usdc_micro) FROM payout_history 
                WHERE recipient_id = pc.collaborator_id AND project_id = ${projectId} AND status = 'success'), 0) as total_earned
    FROM project_collaborators pc
    LEFT JOIN users u ON pc.collaborator_id = u.id
    WHERE pc.project_id = ${projectId}
    ORDER BY pc.created_at ASC
  `;
  return result;
}

export async function updateCollaboratorStatus(projectId: number, collaboratorId: number, status: string) {
  const db_instance = getDb();
  const result = await db_instance`
    UPDATE project_collaborators 
    SET status = ${status}, joined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ${projectId} AND collaborator_id = ${collaboratorId}
    RETURNING *
  `;
  return result[0] || null;
}

export async function getApprovalStatus(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      pc.collaborator_id as id,
      u.email,
      u.display_name as name,
      pc.status,
      pc.split_percentage,
      pc.joined_at as approved_at
    FROM project_collaborators pc
    LEFT JOIN users u ON pc.collaborator_id = u.id
    WHERE pc.project_id = ${projectId} AND pc.role != 'creator'
    ORDER BY pc.created_at ASC
  `;
  return result;
}

export async function checkAllApproved(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'approved' OR status = 'accepted' THEN 1 END) as approved
    FROM project_collaborators 
    WHERE project_id = ${projectId}
  `;
  const { total, approved } = result[0];
  return total === approved;
}

export async function removeCollaborator(projectId: number, collaboratorId: number) {
  const db_instance = getDb();
  await db_instance`
    UPDATE project_collaborators 
    SET status = 'removed', removed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ${projectId} AND id = ${collaboratorId}
  `;
}

/**
 * Split config operations - Extended
 */
export async function saveSplitConfig(
  projectId: number,
  createdById: number,
  onChainConfigVersion: number,
  configData: any,
  isActive: boolean = false
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO split_configs (project_id, on_chain_config_version, config_data, created_by_id, is_active)
    VALUES (${projectId}, ${onChainConfigVersion}, ${JSON.stringify(configData)}, ${createdById}, ${isActive})
    RETURNING id, on_chain_config_version, created_at
  `;
  return result[0];
}

export async function getCurrentSplitConfig(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT * FROM split_configs 
    WHERE project_id = ${projectId} AND is_active = true
    ORDER BY created_at DESC LIMIT 1
  `;
  return result[0] || null;
}

export async function getSplitConfigHistory(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      sc.id,
      sc.on_chain_config_version as version,
      sc.config_data,
      sc.is_active,
      u.display_name as created_by_name,
      sc.created_at,
      sc.updated_at
    FROM split_configs sc
    LEFT JOIN users u ON sc.created_by_id = u.id
    WHERE sc.project_id = ${projectId}
    ORDER BY sc.created_at DESC
  `;
  return result;
}

export async function activateSplitConfig(projectId: number, configId: number) {
  const db_instance = getDb();
  // Deactivate all current configs
  await db_instance`
    UPDATE split_configs SET is_active = false WHERE project_id = ${projectId}
  `;
  // Activate the new one
  const result = await db_instance`
    UPDATE split_configs SET is_active = true WHERE id = ${configId}
    RETURNING *
  `;
  return result[0];
}

export async function approveSplitConfig(splitConfigId: number, collaboratorId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO split_config_approvals (split_config_id, collaborator_id, approved_at)
    VALUES (${splitConfigId}, ${collaboratorId}, CURRENT_TIMESTAMP)
    ON CONFLICT (split_config_id, collaborator_id) DO UPDATE
    SET approved_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return result[0];
}

export async function getSplitConfigApprovals(splitConfigId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT sca.*, u.display_name as collaborator_name, u.email
    FROM split_config_approvals sca
    LEFT JOIN users u ON sca.collaborator_id = u.id
    WHERE sca.split_config_id = ${splitConfigId}
  `;
  return result;
}

export async function checkIfAllApproved(projectId: number, splitConfigId: number) {
  const db_instance = getDb();
  
  // Get total collaborators (excluding removed ones)
  const totalCollaborators = await db_instance`
    SELECT COUNT(*) as count FROM project_collaborators 
    WHERE project_id = ${projectId} AND status != 'removed'
  `;
  
  // Get approvals for this split
  const approvals = await db_instance`
    SELECT COUNT(*) as count FROM split_config_approvals 
    WHERE split_config_id = ${splitConfigId}
  `;
  
  const totalCount = totalCollaborators[0]?.count || 0;
  const approvalCount = approvals[0]?.count || 0;
  
  console.log(`Checking approvals: ${approvalCount}/${totalCount} approved`);
  
  return totalCount > 0 && approvalCount === totalCount;
}


export async function getPendingSplitWithApprovals(projectId: number) {
  const db_instance = getDb();
  
  // Get pending split (not active, most recent)
  const pendingSplit = await db_instance`
    SELECT 
      sc.id,
      sc.on_chain_config_version as version,
      sc.config_data,
      sc.is_active,
      u.display_name as created_by_name,
      u.id as created_by_id,
      sc.created_at,
      sc.updated_at
    FROM split_configs sc
    LEFT JOIN users u ON sc.created_by_id = u.id
    WHERE sc.project_id = ${projectId} AND sc.is_active = false
    ORDER BY sc.created_at DESC 
    LIMIT 1
  `;
  
  if (!pendingSplit || pendingSplit.length === 0) {
    return null;
  }
  
  const split = pendingSplit[0];
  
  // Get all collaborators
  const allCollaborators = await db_instance`
    SELECT id FROM project_collaborators 
    WHERE project_id = ${projectId} AND status = 'accepted'
  `;
  
  // Get approvals for this split
  const approvals = await db_instance`
    SELECT collaborator_id, approved_at FROM split_config_approvals 
    WHERE split_config_id = ${split.id}
  `;
  
  const approvalSet = new Set(approvals.map((a: any) => a.collaborator_id));
  
  return {
    ...split,
    totalCollaborators: allCollaborators.length,
    approvalCount: approvals.length,
    approvals: approvals,
  };
}

/**
 * Vault Balance & Revenue operations
 */
export async function getVaultBalance(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      COALESCE((SELECT SUM(total_amount_usdc_micro) FROM payout_batches 
                WHERE project_id = ${projectId} AND status = 'executed' AND num_recipients = 0), 0) as total_deposited,
      COALESCE((SELECT SUM(amount_usdc_micro) FROM payout_history 
                WHERE project_id = ${projectId} AND status = 'success'), 0) as total_distributed,
      COALESCE((SELECT SUM(amount_usdc_micro) FROM payout_history 
                WHERE project_id = ${projectId} AND status = 'pending'), 0) as pending_distribution
    FROM projects WHERE id = ${projectId}
  `;
  return result[0];
}

export async function getExpectedShares(projectId: number) {
  const db_instance = getDb();
  
  const balanceResult = await db_instance`
    SELECT 
      COALESCE((SELECT SUM(total_amount_usdc_micro) FROM payout_batches 
                WHERE project_id = ${projectId} AND status = 'executed' AND num_recipients = 0), 0) -
      COALESCE((SELECT SUM(amount_usdc_micro) FROM payout_history 
                WHERE project_id = ${projectId} AND status = 'success'), 0) as balance_micro
    FROM projects WHERE id = ${projectId}
  `;

  const vaultBalanceMicro = balanceResult[0].balance_micro;

  const collabResult = await db_instance`
    SELECT 
      pc.collaborator_id,
      u.email,
      u.display_name as name,
      pc.split_percentage,
      COALESCE((SELECT SUM(amount_usdc_micro) FROM payout_history 
       WHERE recipient_id = u.id AND project_id = ${projectId} AND status = 'success'), 0) as total_earned
    FROM project_collaborators pc
    LEFT JOIN users u ON pc.collaborator_id = u.id
    WHERE pc.project_id = ${projectId} AND (pc.status = 'approved' OR pc.status = 'accepted')
    ORDER BY pc.created_at ASC
  `;

  return {
    vaultBalanceMicro,
    collaborators: collabResult,
  };
}

/**
 * Payout Batch & History operations
 */
export async function createDepositBatch(projectId: number, amountUsdcMicro: number) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO payout_batches (project_id, total_amount_usdc_micro, num_recipients, status)
    VALUES (${projectId}, ${amountUsdcMicro}, 0, 'executed')
    RETURNING *
  `;
  return result[0];
}

export async function getDepositHistory(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT id, total_amount_usdc_micro as amount, status, created_at
    FROM payout_batches
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
  `;
  return result;
}

export async function getProjectTransactionHistory(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 'deposit' as type, pb.total_amount_usdc_micro as amount, pb.created_at as date, NULL::text as from_user, pb.on_chain_batch_id as tx_hash
    FROM payout_batches pb
    WHERE pb.project_id = ${projectId}
    UNION ALL
    SELECT 'distribution' as type, amount_usdc_micro as amount, created_at as date, NULL::text as from_user, on_chain_record_id as tx_hash
    FROM payout_history
    WHERE project_id = ${projectId}
    ORDER BY date DESC
    LIMIT 50
  `;
  return result;
}

export async function createPayoutDistribution(projectId: number, totalAmountMicro: number, numRecipients: number) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO payout_batches (project_id, total_amount_usdc_micro, num_recipients, status)
    VALUES (${projectId}, ${totalAmountMicro}, ${numRecipients}, 'pending')
    RETURNING *
  `;
  return result[0];
}

export async function recordPayoutHistory(
  batchId: number,
  projectId: number,
  recipientId: number,
  amountUsdcMicro: number,
  onChainRecordId?: string
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO payout_history (batch_id, project_id, recipient_id, amount_usdc_micro, on_chain_record_id, status)
    VALUES (${batchId}, ${projectId}, ${recipientId}, ${amountUsdcMicro}, ${onChainRecordId || null}, 'success')
    RETURNING *
  `;
  return result[0];
}

export async function updatePayoutBatchExecuted(batchId: number, onChainBatchId?: string) {
  const db_instance = getDb();
  const result = await db_instance`
    UPDATE payout_batches
    SET status = 'executed', on_chain_batch_id = ${onChainBatchId || null}, executed_at = CURRENT_TIMESTAMP
    WHERE id = ${batchId}
    RETURNING *
  `;
  return result[0];
}

export async function getPayoutBatchById(batchId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT * FROM payout_batches WHERE id = ${batchId}
  `;
  return result[0] || null;
}

export async function getPayoutBatchTransactions(batchId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      ph.id,
      ph.recipient_id,
      u.email,
      u.display_name as name,
      ph.amount_usdc_micro,
      ph.status,
      ph.on_chain_record_id,
      ph.created_at
    FROM payout_history ph
    LEFT JOIN users u ON ph.recipient_id = u.id
    WHERE ph.batch_id = ${batchId}
    ORDER BY ph.created_at DESC
  `;
  return result;
}

export async function getUserPayoutHistory(userId: number, limit: number = 50, offset: number = 0) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      ph.id,
      ph.batch_id,
      pb.project_id,
      p.name as project_name,
      ph.amount_usdc_micro,
      ph.status,
      ph.created_at,
      u.email as creator_email
    FROM payout_history ph
    JOIN payout_batches pb ON ph.batch_id = pb.id
    JOIN projects p ON ph.project_id = p.id
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE ph.recipient_id = ${userId} OR p.creator_id = ${userId}
    ORDER BY ph.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return result;
}

/**
 * Public project listing - for marketplace/explore page
 * Returns all active projects with public-facing info
 */
export async function getPublicProjects(limit: number = 50, offset: number = 0) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      p.id,
      p.creator_id,
      p.name,
      p.description,
      p.cover_image_url,
      p.price_display_usd,
      p.is_active,
      p.created_at,
      u.display_name as creator_name,
      u.profile_picture_url as creator_avatar,
      (SELECT COUNT(*) FROM project_collaborators WHERE project_id = p.id) as collaborator_count,
      COALESCE((SELECT SUM(total_amount_usdc_micro) FROM payout_batches WHERE project_id = p.id AND status = 'executed'), 0) as total_raised_micro,
      (
        SELECT COALESCE(json_agg(collaborator_id), '[]'::json)
        FROM project_collaborators
        WHERE project_id = p.id AND status = 'accepted'
      ) as collaborator_ids
    FROM projects p
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE p.is_active = true
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return result;
}

/**
 * Get single public project by ID - for public project page
 * Returns only active projects with public-facing info (no sensitive data)
 */
export async function getPublicProjectById(projectId: number) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT 
      p.id,
      p.creator_id,
      p.name,
      p.description,
      p.cover_image_url,
      p.price_display_usd,
      p.is_active,
      p.created_at,
      u.display_name as creator_name,
      u.profile_picture_url as creator_avatar,
      (SELECT COUNT(*) FROM project_collaborators WHERE project_id = p.id) as collaborator_count,
      COALESCE((SELECT SUM(total_amount_usdc_micro) FROM payout_batches WHERE project_id = p.id AND status = 'executed'), 0) as total_raised_micro,
      (
        SELECT COALESCE(json_agg(collaborator_id), '[]'::json)
        FROM project_collaborators
        WHERE project_id = p.id AND status = 'accepted'
      ) as collaborator_ids
    FROM projects p
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE p.id = ${projectId} AND p.is_active = true
  `;
  return result[0] || null;
}
