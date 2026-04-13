import {
  AptosClient,
  AptosAccount,
  TxnBuilderTypes,
  BCS,
  HexString,
} from "aptos";

/**
 * Aptos Client Service
 * Handles all blockchain interactions
 */

let client: AptosClient;
let adminAccount: AptosAccount;

const MODULE_ADDRESS = process.env.APTOS_MODULE_ADDRESS || "0x1";
const USDC_COIN_TYPE = `${MODULE_ADDRESS}::usdc::USDC`;

export async function initializeAptosClient() {
  const nodeUrl = process.env.APTOS_NODE_URL || "https://testnet.api.aptos.dev/v1";
  client = new AptosClient(nodeUrl);

  // Initialize admin account (for deploying contracts and executing payouts)
  const adminPrivateKeyHex = process.env.APTOS_ADMIN_PRIVATE_KEY;
  if (!adminPrivateKeyHex) {
    throw new Error("APTOS_ADMIN_PRIVATE_KEY not set");
  }

  const privateKeyBytes = Buffer.from(adminPrivateKeyHex, "hex");
  adminAccount = new AptosAccount(privateKeyBytes);

  console.log(`✅ Aptos Client connected to ${nodeUrl}`);
  console.log(`Admin account: ${adminAccount.address()}`);
}

export function getClient(): AptosClient {
  if (!client) {
    throw new Error("Aptos client not initialized");
  }
  return client;
}

export function getAdminAccount(): AptosAccount {
  if (!adminAccount) {
    throw new Error("Admin account not initialized");
  }
  return adminAccount;
}

/**
 * Create initial split config on-chain
 */
export async function createSplitConfigOnChain(
  projectId: bigint,
  collaborators: string[],
  splitPercentages: number[],
  treasuryAddress: string
): Promise<string> {
  const account = getAdminAccount();
  const aptosClient = getClient();

  const collaboratorAccounts = collaborators.map(
    (addr) => new HexString(addr)
  );
  const percentages = splitPercentages.map((p) => p);

  const payload = {
    type: "entry_function_payload",
    function: `${MODULE_ADDRESS}::split_config::create_split_config`,
    type_arguments: [],
    arguments: [
      projectId.toString(),
      collaboratorAccounts,
      percentages,
      new HexString(treasuryAddress),
    ],
  };

  try {
    const txn = await aptosClient.generateTransaction(account.address(), payload as any);
    const signed = await aptosClient.signTransaction(account, txn as any);
    const result = await aptosClient.submitTransaction(signed as any);
    await aptosClient.waitForTransaction(result.hash as string);

    console.log(`✅ Split config created on-chain for project ${projectId}`);
    return result.hash as string;
  } catch (error) {
    console.error("❌ Failed to create split config:", error);
    throw error;
  }
}

/**
 * Create a payout batch on-chain
 */
export async function createPayoutBatchOnChain(
  projectId: bigint,
  recipients: string[],
  splitPercentages: number[],
  totalAmountUscdc: bigint
): Promise<{ txHash: string; batchId: bigint }> {
  const account = getAdminAccount();
  const aptosClient = getClient();

  const recipientAccounts = recipients.map((addr) => new HexString(addr));
  const percentages = splitPercentages.map((p) => BigInt(p));

  const payload = {
    type: "entry_function_payload",
    function: `${MODULE_ADDRESS}::revenue_splitter::create_payout_batch`,
    type_arguments: [USDC_COIN_TYPE],
    arguments: [
      projectId.toString(),
      recipientAccounts,
      percentages,
      totalAmountUscdc.toString(),
    ],
  };

  try {
    const txn = await aptosClient.generateTransaction(account.address(), payload as any);
    const signed = await aptosClient.signTransaction(account, txn as any);
    const result = await aptosClient.submitTransaction(signed as any);
    await aptosClient.waitForTransaction(result.hash as string);

    console.log(`✅ Payout batch created on-chain for project ${projectId}`);

    // In production, extract batch_id from events
    return {
      txHash: result.hash as string,
      batchId: BigInt(0), // TODO: Extract from events
    };
  } catch (error) {
    console.error("❌ Failed to create payout batch:", error);
    throw error;
  }
}

/**
 * Execute payout batch on-chain
 */
export async function executePayoutBatchOnChain(batchId: bigint): Promise<string> {
  const account = getAdminAccount();
  const aptosClient = getClient();

  const payload = {
    type: "entry_function_payload",
    function: `${MODULE_ADDRESS}::revenue_splitter::execute_payout_batch`,
    type_arguments: [USDC_COIN_TYPE],
    arguments: [batchId.toString()],
  };

  try {
    const txn = await aptosClient.generateTransaction(account.address(), payload as any);
    const signed = await aptosClient.signTransaction(account, txn as any);
    const result = await aptosClient.submitTransaction(signed as any);
    await aptosClient.waitForTransaction(result.hash as string);

    console.log(`✅ Payout batch ${batchId} executed on-chain`);
    return result.hash as string;
  } catch (error) {
    console.error("❌ Failed to execute payout batch:", error);
    throw error;
  }
}

/**
 * Record payout execution on-chain (after blockchain execution succeeds)
 */
export async function recordPayoutOnChain(
  batchId: bigint,
  projectId: bigint,
  recipients: string[],
  amounts: bigint[],
  statuses: number[], // 0: pending, 1: success, 2: failed
  txHashes: string[]
): Promise<string> {
  const account = getAdminAccount();
  const aptosClient = getClient();

  const recipientAccounts = recipients.map((addr) => new HexString(addr));

  const payload = {
    type: "entry_function_payload",
    function: `${MODULE_ADDRESS}::payout_registry::batch_record_payouts`,
    type_arguments: [],
    arguments: [
      batchId.toString(),
      projectId.toString(),
      recipientAccounts,
      amounts.map((a) => a.toString()),
      statuses,
      txHashes.map((h) => Buffer.from(h.replace("0x", ""), "hex")),
    ],
  };

  try {
    const txn = await aptosClient.generateTransaction(account.address(), payload as any);
    const signed = await aptosClient.signTransaction(account, txn as any);
    const result = await aptosClient.submitTransaction(signed as any);
    await aptosClient.waitForTransaction(result.hash as string);

    console.log(`✅ Payout records saved on-chain for batch ${batchId}`);
    return result.hash as string;
  } catch (error) {
    console.error("❌ Failed to record payouts:", error);
    throw error;
  }
}

/**
 * Get current split config from on-chain
 */
export async function getSplitConfigOnChain(projectId: bigint): Promise<any> {
  const aptosClient = getClient();

  try {
    const resource = await aptosClient.getAccountResources(
      new HexString(MODULE_ADDRESS)
    );

    // Filter for split config resource
    // In production, parse the resource properly
    return null; // TODO: Implement proper resource parsing
  } catch (error) {
    console.error("❌ Failed to get split config:", error);
    throw error;
  }
}

/**
 * Check account USDC balance
 */
export async function getUsdcBalance(address: string): Promise<bigint> {
  const aptosClient = getClient();

  try {
    const resources = await aptosClient.getAccountResources(new HexString(address));
    const coinsResource = resources.find(
      (r: any) => r.type === `0x1::coin::CoinStore<${USDC_COIN_TYPE}>`
    );

    if (!coinsResource) {
      return BigInt(0);
    }

    const balance = (coinsResource.data as any).coin?.value || 0;
    return BigInt(balance);
  } catch (error) {
    console.error("❌ Failed to get USDC balance:", error);
    return BigInt(0);
  }
}
