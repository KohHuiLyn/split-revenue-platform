import dotenv from "dotenv";
dotenv.config();

import { initializeDatabase, getDb } from "./src/database";

const APTOS_FAUCET_URL = "https://faucet.testnet.aptoslabs.com";

async function fundWallet(address: string): Promise<void> {
  try {
    const response = await fetch(`${APTOS_FAUCET_URL}/mint?address=${address}&amount=200000000`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (response.ok) {
      console.log(`✅ Funded: ${address}`);
    } else {
      console.log(`❌ Failed: ${address} - ${response.status}`);
    }
  } catch (e) {
    console.log(`❌ Error: ${address} - ${e}`);
  }
}

async function main() {
  await initializeDatabase();
  const db = getDb();
  
  const users = await db`SELECT wallet_address FROM users`;
  console.log(`Funding ${users.length} wallets...\n`);
  
  for (const u of users) {
    await fundWallet(u.wallet_address);
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});