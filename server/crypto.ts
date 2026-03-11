import crypto from "crypto";
import { ENV } from "./_core/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte encryption key from the JWT_SECRET.
 * Uses PBKDF2 with a fixed salt for deterministic key derivation.
 */
function getEncryptionKey(): Buffer {
  const secret = ENV.cookieSecret;
  if (!secret) {
    throw new Error("JWT_SECRET is required for encryption");
  }
  // Use a fixed salt derived from the secret itself for deterministic key derivation
  const salt = crypto.createHash("sha256").update("zendesk-config-salt").digest();
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha512");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64 string containing IV + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a base64 string that was encrypted with encrypt().
 * Extracts IV + authTag + ciphertext and returns the plaintext.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, "base64");

  // Extract IV, authTag, and ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Masks a string for display purposes.
 * Shows only the first 3 and last 3 characters.
 */
export function maskString(value: string): string {
  if (value.length <= 8) {
    return "****" + value.slice(-2);
  }
  return value.slice(0, 3) + "****" + value.slice(-3);
}
