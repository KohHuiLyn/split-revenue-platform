import {
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
  Ed25519Account,
  AccountAddress,
  PrivateKey,
} from "@aptos-labs/ts-sdk";

/**
 * Aptos Client Service
 * Handles all blockchain interactions
 */

let client: Aptos;
let adminAccount: Ed25519Account;

const MODULE_ADDRESS = process.env.APTOS_MODULE_ADDRESS || "0x1";

// Circle USDC addresses per network (from Circle docs)
const USDC_MAINNET = "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b";
const USDC_TESTNET = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";
/**
 * Get the USDC coin type for the current network
 * Dynamically selects based on APTOS_NODE_URL
 */
export function getUsdcCoinType(): string {
  const nodeUrl = process.env.APTOS_NODE_URL || "";

  if (nodeUrl.includes("mainnet")) {
    return `${USDC_MAINNET}`;
  }
  // Default to testnet
  return `${USDC_TESTNET}`;
}

const USDC_COIN_TYPE = getUsdcCoinType();

export async function initializeAptosClient() {
  const nodeUrl = process.env.APTOS_NODE_URL || "https://testnet.api.aptos.dev/v1";

  // Create AptosConfig and Aptos client (new SDK pattern)
  const config = new AptosConfig({
    network: Network.TESTNET,
    fullnode: nodeUrl,
  });
  client = new Aptos(config);

  // Initialize admin account (for deploying contracts and executing payouts)
  const adminPrivateKeyHex = process.env.APTOS_ADMIN_PRIVATE_KEY;
  if (!adminPrivateKeyHex) {
    throw new Error("APTOS_ADMIN_PRIVATE_KEY not set");
  }

  // Format to AIP-80 compliant string to suppress warning
  const aip80PrivateKey = PrivateKey.formatPrivateKey(adminPrivateKeyHex, "ed25519");
  const privateKey = new Ed25519PrivateKey(aip80PrivateKey);
  adminAccount = new Ed25519Account({ privateKey });

  console.log(`✅ Aptos Client connected to ${nodeUrl}`);
  console.log(`Admin account: ${adminAccount.accountAddress.toString()}`);
}

export function getClient(): Aptos {
  if (!client) {
    throw new Error("Aptos client not initialized");
  }
  return client;
}

export function getAdminAccount(): Ed25519Account {
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
  const aptos = getClient();

  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::split_config::create_split_config`,
        functionArguments: [
          projectId.toString(),
          collaborators,
          splitPercentages,
          treasuryAddress,
        ],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: response.hash });

    console.log(`✅ Split config created on-chain for project ${projectId}`);
    return response.hash;
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
  const aptos = getClient();

  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::revenue_splitter::create_payout_batch`,
        typeArguments: [USDC_COIN_TYPE],
        functionArguments: [
          projectId.toString(),
          recipients,
          splitPercentages.map((p) => BigInt(p)),
          totalAmountUscdc.toString(),
        ],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: response.hash });

    console.log(`✅ Payout batch created on-chain for project ${projectId}`);

    // In production, extract batch_id from events
    return {
      txHash: response.hash,
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
  const aptos = getClient();

  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::revenue_splitter::execute_payout_batch`,
        typeArguments: [USDC_COIN_TYPE],
        functionArguments: [batchId.toString()],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: response.hash });

    console.log(`✅ Payout batch ${batchId} executed on-chain`);
    return response.hash;
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
  const aptos = getClient();

  // Convert hex strings to Uint8Array for the payload
  const txHashesBytes = txHashes.map((h) =>
    Uint8Array.from(Buffer.from(h.replace("0x", ""), "hex"))
  );

  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::payout_registry::batch_record_payouts`,
        functionArguments: [
          batchId.toString(),
          projectId.toString(),
          recipients,
          amounts.map((a) => a.toString()),
          statuses,
          txHashesBytes,
        ],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: response.hash });

    console.log(`✅ Payout records saved on-chain for batch ${batchId}`);
    return response.hash;
  } catch (error) {
    console.error("❌ Failed to record payouts:", error);
    throw error;
  }
}

/**
 * Get current split config from on-chain
 */
export async function getSplitConfigOnChain(projectId: bigint): Promise<any> {
  const aptos = getClient();

  try {
    const resources = await aptos.account.getAccountResources({
      accountAddress: AccountAddress.from(MODULE_ADDRESS),
    });

    // Filter for split config resource
    // In production, parse the resource properly
    return null; // TODO: Implement proper resource parsing
  } catch (error) {
    console.error("❌ Failed to get split config:", error);
    throw error;
  }
}

/**
 * Check account USDC balance using Fungible Asset API
 */
export async function getUsdcBalance(address: string): Promise<bigint> {
  const client = getClient();

  try {
    // Use getCurrentFungibleAssetBalances with filter for USDC asset type
    const balances = await client.getCurrentFungibleAssetBalances({
      options: {
        where: {
          owner_address: { _eq: address },
          asset_type: { _eq: getUsdcCoinType() },
        },
        limit: 1,
      },
    });

    if (!balances || balances.length === 0) {
      return BigInt(0);
    }

    return BigInt(balances[0].amount);
  } catch (error: any) {
    // Account might not have USDC yet - that's OK
    if (error.status === 404 || error.message?.includes("404") || error.message?.includes("not found")) {
      return BigInt(0);
    }
    console.error("❌ Failed to get USDC balance:", error.message || error);
    return BigInt(0);
  }
}
