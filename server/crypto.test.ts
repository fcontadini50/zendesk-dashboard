import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the ENV module before importing crypto
vi.mock("./_core/env", () => ({
  ENV: {
    cookieSecret: "test-secret-key-for-testing-purposes-only",
  },
}));

import { encrypt, decrypt, maskString } from "./crypto";

describe("crypto module", () => {
  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a simple string", () => {
      const plaintext = "hello world";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should encrypt and decrypt a Zendesk domain", () => {
      const domain = "d3v-movigoo-78837.zendesk.com";
      const encrypted = encrypt(domain);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(domain);
    });

    it("should encrypt and decrypt an email", () => {
      const email = "user@example.com";
      const encrypted = encrypt(email);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(email);
    });

    it("should encrypt and decrypt an API token", () => {
      const token = "abc123XYZ789-long-api-token-value";
      const encrypted = encrypt(token);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(token);
    });

    it("should produce different ciphertext for the same plaintext (random IV)", () => {
      const plaintext = "same text";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it("should produce base64 output", () => {
      const encrypted = encrypt("test");
      // Base64 characters only
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("should throw on tampered ciphertext", () => {
      const encrypted = encrypt("test");
      const tampered = encrypted.slice(0, -4) + "XXXX";
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("maskString", () => {
    it("should mask a long string showing first 3 and last 3 chars", () => {
      const result = maskString("user@example.com");
      expect(result).toBe("use****com");
    });

    it("should mask a short string showing only last 2 chars", () => {
      const result = maskString("short");
      expect(result).toBe("****rt");
    });

    it("should handle very short strings", () => {
      const result = maskString("ab");
      expect(result).toBe("****ab");
    });

    it("should mask a domain correctly", () => {
      const result = maskString("d3v-movigoo-78837.zendesk.com");
      expect(result).toBe("d3v****com");
    });
  });
});
