import {
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
  Ed25519Account,
  PrivateKey,
  PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * Aptos client service for Splitr contracts.
 */

let client: Aptos;
let adminAccount: Ed25519Account;

const MODULE_ADDRESS = process.env.APTOS_MODULE_ADDRESS;

// Circle USDC metadata object addresses.
const USDC_MAINNET = "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b";
const USDC_TESTNET = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";

export function getUsdcCoinType(): string {
  const nodeUrl = process.env.APTOS_NODE_URL || "";
  if (nodeUrl.includes("mainnet")) {
    return USDC_MAINNET;
  }
  return USDC_TESTNET;
}

export function getUsdcMetadataAddress(): string {
  return getUsdcCoinType();
}

function toMoveByteVector(input: string): number[] {
  return Array.from(Buffer.from(input, "utf8"));
}

async function submitEntryFunction(
  signer: Ed25519Account,
  functionId: string,
  functionArguments: Array<any>,
  typeArguments: string[] = []
): Promise<string> {
  const aptos = getClient();
  const transaction = await aptos.transaction.build.simple({
    sender: signer.accountAddress,
    data: {
      function: functionId,
      typeArguments,
      functionArguments,
    },
  });

  const response = await aptos.transaction.signAndSubmitTransaction({
    signer,
    transaction,
  });

  await aptos.waitForTransaction({ transactionHash: response.hash });
  return response.hash;
}

export async function initializeAptosClient() {
  const nodeUrl = process.env.APTOS_NODE_URL || "https://testnet.api.aptos.dev/v1";
  const network = nodeUrl.includes("mainnet") ? Network.MAINNET : Network.TESTNET;

  const config = new AptosConfig({
    network,
    fullnode: nodeUrl,
  });
  client = new Aptos(config);

  const adminPrivateKeyHex = process.env.APTOS_ADMIN_PRIVATE_KEY;
  if (!adminPrivateKeyHex) {
    throw new Error("APTOS_ADMIN_PRIVATE_KEY not set");
  }

  const aip80PrivateKey = PrivateKey.formatPrivateKey(adminPrivateKeyHex, PrivateKeyVariants.Ed25519);
  const privateKey = new Ed25519PrivateKey(aip80PrivateKey);
  adminAccount = new Ed25519Account({ privateKey });

  console.log(`Aptos client connected to ${nodeUrl}`);
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

export async function isVaultFactoryInitialized(): Promise<boolean> {
  const aptos = getClient();
  const result = await aptos.view({
    payload: {
      function: `${MODULE_ADDRESS}::vault_factory::is_initialized`,
      functionArguments: [],
    },
  });
  return Boolean(result?.[0]);
}

async function isSplitRegistryInitialized(): Promise<boolean> {
  const aptos = getClient();
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::split_config::is_registry_initialized`,
        functionArguments: [],
      },
    });
    return Boolean(result?.[0]);
  } catch (error: any) {
    throw new Error(
      `Missing on-chain function split_config::is_registry_initialized. Publish the latest contracts at ${MODULE_ADDRESS} before starting backend dependency checks. Original error: ${error?.message || error}`
    );
  }
}

async function isPayoutRegistryInitialized(): Promise<boolean> {
  const aptos = getClient();
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::payout_registry::is_registry_initialized`,
        functionArguments: [],
      },
    });
    return Boolean(result?.[0]);
  } catch (error: any) {
    throw new Error(
      `Missing on-chain function payout_registry::is_registry_initialized. Publish the latest contracts at ${MODULE_ADDRESS} before starting backend dependency checks. Original error: ${error?.message || error}`
    );
  }
}

export async function ensureVaultFactoryInitialized(): Promise<void> {
  if (await isVaultFactoryInitialized()) {
    await ensureFactoryDependenciesInitialized();
    return;
  }

  const admin = getAdminAccount();
  const usdcMetadataAddress = getUsdcMetadataAddress();

  try {
    await submitEntryFunction(
      admin,
      `${MODULE_ADDRESS}::vault_factory::init_factory`,
      [usdcMetadataAddress]
    );
  } catch (error: any) {
    // Handle race between multiple backend instances.
    const message = String(error?.message || "").toLowerCase();
    const maybeRace = message.includes("already initialized") || message.includes("abort");
    if (!maybeRace) {
      throw error;
    }
  }

  if (!(await isVaultFactoryInitialized())) {
    throw new Error("vault_factory is still not initialized after init attempt");
  }

  await ensureFactoryDependenciesInitialized();
}

async function ensureFactoryDependenciesInitialized(): Promise<void> {
  const [splitReady, payoutReady] = await Promise.all([
    isSplitRegistryInitialized(),
    isPayoutRegistryInitialized(),
  ]);

  if (splitReady && payoutReady) {
    return;
  }

  const admin = getAdminAccount();
  try {
    await submitEntryFunction(
      admin,
      `${MODULE_ADDRESS}::vault_factory::init_missing_registries`,
      []
    );
  } catch (error: any) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("function") && message.includes("not") && message.includes("found")) {
      throw new Error(
        `Missing on-chain function vault_factory::init_missing_registries. Publish the latest contracts at ${MODULE_ADDRESS} before starting backend dependency checks. Original error: ${error?.message || error}`
      );
    }
    const maybeRace = message.includes("already") || message.includes("abort");
    if (!maybeRace) {
      throw error;
    }
  }

  const [splitAfter, payoutAfter] = await Promise.all([
    isSplitRegistryInitialized(),
    isPayoutRegistryInitialized(),
  ]);
  if (!splitAfter || !payoutAfter) {
    throw new Error("split or payout registry is still not initialized after init attempt");
  }
}

// export async function createSplitConfigOnChain(
//   signer: Ed25519Account,
//   projectId: bigint,
//   collaborators: string[],
//   splitPercentagesBps: number[],
//   treasuryAddress: string
// ): Promise<string> {
//   return submitEntryFunction(
//     signer,
//     `${MODULE_ADDRESS}::split_config::create_split_config`,
//     [projectId.toString(), collaborators, splitPercentagesBps, treasuryAddress]
//   );
// }

export async function createVaultOnChain(
  signer: Ed25519Account,
  projectId: bigint,
  collaborators: string[],
  splitPercentagesBps: number[]
): Promise<string> {
  return submitEntryFunction(
    signer,
    `${MODULE_ADDRESS}::vault_factory::create_vault`,
    [projectId.toString(), collaborators, splitPercentagesBps]
  );
}

export async function depositRevenueOnChain(
  signer: Ed25519Account,
  projectId: bigint,
  amountUsdcMicro: bigint
): Promise<string> {
  return submitEntryFunction(
    signer,
    `${MODULE_ADDRESS}::vault_factory::deposit_revenue`,
    [projectId.toString(), amountUsdcMicro.toString()]
  );
}

export async function executePayoutOnChain(
  signer: Ed25519Account,
  projectId: bigint,
  payoutAmountUsdcMicro: bigint,
  payoutReference: string
): Promise<string> {
  return submitEntryFunction(
    signer,
    `${MODULE_ADDRESS}::vault_factory::execute_payout`,
    [
      projectId.toString(),
      payoutAmountUsdcMicro.toString(),
      toMoveByteVector(payoutReference),
    ]
  );
}

export async function getVaultBalanceOnChain(projectId: bigint): Promise<bigint> {
  const aptos = getClient();
  const result = await aptos.view({
    payload: {
      function: `${MODULE_ADDRESS}::vault_factory::get_vault_balance`,
      functionArguments: [projectId.toString()],
    },
  });
  return BigInt(String(result?.[0] ?? "0"));
}

export async function getVaultTotalsOnChain(
  projectId: bigint
): Promise<{ totalDeposited: bigint; totalDistributed: bigint }> {
  const aptos = getClient();
  const result = await aptos.view({
    payload: {
      function: `${MODULE_ADDRESS}::vault_factory::get_vault_totals`,
      functionArguments: [projectId.toString()],
    },
  });

  const tuple = (result?.[0] as Array<string | number | bigint>) || [];
  return {
    totalDeposited: BigInt(String(tuple[0] ?? "0")),
    totalDistributed: BigInt(String(tuple[1] ?? "0")),
  };
}

/**
 * Check account USDC balance via indexer query.
 */
export async function getUsdcBalance(address: string): Promise<bigint> {
  const aptos = getClient();

  try {
    const balances = await aptos.getCurrentFungibleAssetBalances({
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
    if (error.status === 404 || error.message?.includes("404") || error.message?.includes("not found")) {
      return BigInt(0);
    }
    console.error("Failed to get USDC balance:", error.message || error);
    return BigInt(0);
  }
}
