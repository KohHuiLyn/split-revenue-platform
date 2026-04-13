import crypto from "crypto";
import { AptosAccount } from "aptos";

/**
 * Wallet Service
 * Handles server-side wallet generation and encryption
 * For production: use AWS KMS, HashiCorp Vault, or similar for key management
 */

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(String(process.env.WALLET_ENCRYPTION_KEY || "default-insecure-key"))
  .digest();

export interface WalletCredentials {
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
}

/**
 * Generate a new Aptos account and encrypt the private key
 */
export function generateAndEncryptWallet(): WalletCredentials {
  // Generate new Aptos account
  const account = new AptosAccount();

  // Get the private key bytes
  const privateKeyBytes = account.signingKey.secretKey;
  const privateKeyHex = Buffer.from(privateKeyBytes).toString("hex");

  // Encrypt private key
  const encryptedPrivateKey = encryptPrivateKey(privateKeyHex);

  return {
    address: account.address().toString(),
    publicKey: account.pubKey().toString(),
    encryptedPrivateKey,
  };
}

/**
 * Encrypt a private key using AES-256-CBC
 */
export function encryptPrivateKey(privateKeyHex: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(privateKeyHex, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return IV + encrypted data (IV needs to be prepended for decryption)
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a private key
 */
export function decryptPrivateKey(encryptedData: string): string {
  const [iv, encrypted] = encryptedData.split(":");
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(iv, "hex")
  );

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Get an Aptos account from encrypted credentials (for signing transactions)
 */
export function getAccountFromEncrypted(encryptedPrivateKey: string): AptosAccount {
  const privateKeyHex = decryptPrivateKey(encryptedPrivateKey);
  const privateKeyBytes = Buffer.from(privateKeyHex, "hex");

  // Create account from private key
  return new AptosAccount(privateKeyBytes);
}

/**
 * Validate wallet address format
 */
export function isValidAptosAddress(address: string): boolean {
  // Aptos addresses are 32 hex characters or "0x" + 32 hex
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}
