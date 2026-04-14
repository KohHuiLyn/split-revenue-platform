import {
  generateAndEncryptWallet,
  encryptPrivateKey,
  decryptPrivateKey,
  getAccountFromEncrypted,
  isValidAptosAddress,
} from "../src/wallet";

describe("Wallet Service", () => {
  beforeAll(() => {
    // Set up test environment variable
    process.env.WALLET_ENCRYPTION_KEY = "test-encryption-key-1234567890123";
  });

  describe("generateAndEncryptWallet", () => {
    it("should generate a valid wallet with address and encrypted private key", () => {
      const wallet = generateAndEncryptWallet();

      expect(wallet.address).toBeDefined();
      expect(wallet.address.startsWith("0x")).toBe(true);
      expect(wallet.address.length).toBe(66); // 0x + 64 hex chars
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.publicKey.startsWith("0x")).toBe(true);
      expect(wallet.encryptedPrivateKey).toBeDefined();
      expect(wallet.encryptedPrivateKey).toContain(":"); // IV:encrypted format
    });

    it("should generate unique wallets on each call", () => {
      const wallet1 = generateAndEncryptWallet();
      const wallet2 = generateAndEncryptWallet();

      expect(wallet1.address).not.toBe(wallet2.address);
      expect(wallet1.encryptedPrivateKey).not.toBe(wallet2.encryptedPrivateKey);
    });

    it("should generate 64-character hex addresses", () => {
      const wallet = generateAndEncryptWallet();
      const addressWithoutPrefix = wallet.address.slice(2);

      expect(addressWithoutPrefix).toMatch(/^[a-fA-F0-9]{64}$/);
    });
  });

  describe("encryptPrivateKey and decryptPrivateKey", () => {
    it("should encrypt and decrypt a private key correctly", () => {
      const originalKey = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const encrypted = encryptPrivateKey(originalKey);
      const decrypted = decryptPrivateKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    it("should produce different ciphertext for same input with different IVs", () => {
      const key = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      
      const encrypted1 = encryptPrivateKey(key);
      const encrypted2 = encryptPrivateKey(key);

      expect(encrypted1).not.toBe(encrypted2);
      
      // Both should decrypt to same key
      expect(decryptPrivateKey(encrypted1)).toBe(key);
      expect(decryptPrivateKey(encrypted2)).toBe(key);
    });

    it("should return IV:encrypted format", () => {
      const key = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const encrypted = encryptPrivateKey(key);
      
      const [iv, encryptedData] = encrypted.split(":");
      
      expect(iv.length).toBe(32); // 16 bytes = 32 hex chars
      expect(encryptedData.length).toBeGreaterThan(0);
    });
  });

  describe("getAccountFromEncrypted", () => {
    it("should create a valid Ed25519Account from encrypted private key", () => {
      // First generate a wallet
      const wallet = generateAndEncryptWallet();
      
      // Then get account from encrypted key
      const account = getAccountFromEncrypted(wallet.encryptedPrivateKey);
      
      expect(account).toBeDefined();
      expect(account.accountAddress.toString()).toBe(wallet.address);
      expect(account.publicKey.toString()).toBe(wallet.publicKey);
    });

    it("should produce the same account for the same encrypted key", () => {
      const wallet = generateAndEncryptWallet();
      
      const account1 = getAccountFromEncrypted(wallet.encryptedPrivateKey);
      const account2 = getAccountFromEncrypted(wallet.encryptedPrivateKey);
      
      expect(account1.accountAddress.toString()).toBe(account2.accountAddress.toString());
    });
  });

  describe("isValidAptosAddress", () => {
    it("should validate correct 0x addresses", () => {
      expect(isValidAptosAddress("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")).toBe(true);
      expect(isValidAptosAddress("0x0000000000000000000000000000000000000000000000000000000000000001")).toBe(true);
    });

    it("should reject invalid addresses", () => {
      expect(isValidAptosAddress("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")).toBe(false); // missing 0x
      expect(isValidAptosAddress("0x123")).toBe(false); // too short
      expect(isValidAptosAddress("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12")).toBe(false); // too long
      expect(isValidAptosAddress("0xghijklmnopqrstuvwxyz1234567890abcdef1234567890abcdef123456789")).toBe(false); // invalid chars
    });

    it("should handle case insensitivity", () => {
      expect(isValidAptosAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890")).toBe(true);
      expect(isValidAptosAddress("0xAbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890")).toBe(true);
    });
  });
});