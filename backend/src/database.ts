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
  oauthId?: string
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO users (email, oauth_id, wallet_address, wallet_private_key_encrypted)
    VALUES (${email}, ${oauthId || null}, ${walletAddress}, ${encryptedPrivateKey})
    RETURNING id, email, wallet_address, created_at
  `;
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT id, email, wallet_address, wallet_private_key_encrypted, created_at
    FROM users
    WHERE email = ${email}
  `;
  return result[0] || null;
}

export async function getUserByWalletAddress(walletAddress: string) {
  const db_instance = getDb();
  const result = await db_instance`
    SELECT id, email, wallet_address, created_at
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

export async function updatePayoutBatchStatus(batchId: number, status: string, onChainBatchId?: bigint) {
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
 * Split config operations
 */
export async function saveSplitConfig(
  projectId: number,
  createdById: number,
  onChainConfigVersion: bigint,
  configData: any
) {
  const db_instance = getDb();
  const result = await db_instance`
    INSERT INTO split_configs (project_id, on_chain_config_version, config_data, created_by_id)
    VALUES (${projectId}, ${onChainConfigVersion}, ${JSON.stringify(configData)}, ${createdById})
    RETURNING id, on_chain_config_version, created_at
  `;
  return result[0];
}
