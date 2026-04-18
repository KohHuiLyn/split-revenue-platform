import dotenv from "dotenv";
dotenv.config();

import { initializeDatabase, getDb } from "./src/database";

async function main() {
  await initializeDatabase();
  const db = getDb();
  
  const users = await db`SELECT id, email, wallet_address FROM users`;
  console.log(`Found ${users.length} users:\n`);
  
  for (const u of users) {
    console.log(`${u.id}: ${u.wallet_address} (${u.email})`);
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});