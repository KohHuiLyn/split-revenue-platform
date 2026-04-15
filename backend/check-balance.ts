import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from "@aptos-labs/ts-sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function checkBalance() {
  const adminPrivateKey = process.env.APTOS_ADMIN_PRIVATE_KEY!;
  const privateKey = new Ed25519PrivateKey(adminPrivateKey);
  const account = Account.fromPrivateKey({ privateKey });

  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);

  const address = account.accountAddress.toString();
  console.log("Admin address:", address);

  try {
    const balance = await aptos.view({
      payload: {
        function: "0x1::coin::balance",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [address],
      },
    });
    console.log("APT balance (raw):", balance);
    console.log("APT balance (formatted):", Number(balance) / 1e8, "APT");
  } catch (e) {
    console.log("Error checking balance:", e);
  }
}

checkBalance();