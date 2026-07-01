import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export class EncryptionUtil {
  private static getEncryptionKey(): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "default_fallback_encryption_key_32_bytes_long!!";
    return createHash("sha256").update(rawKey).digest();
  }

  static encrypt(text: string): string {
    if (!text) return "";
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `enc:${iv.toString("hex")}:${tag}:${encrypted}`;
  }

  static decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.startsWith("enc:")) return encryptedText;
    try {
      const parts = encryptedText.substring(4).split(":");
      if (parts.length !== 3) return encryptedText;
      const [ivHex, tagHex, encryptedHex] = parts;
      const key = this.getEncryptionKey();
      const iv = Buffer.from(ivHex, "hex");
      const tag = Buffer.from(tagHex, "hex");
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      return encryptedText;
    }
  }

  static encryptConfig(config?: Record<string, string> | null): Record<string, string> {
    if (!config) return {};
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (this.isPrivateConfigKey(key) && value && !value.startsWith("enc:")) {
        encrypted[key] = this.encrypt(value);
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }

  static decryptConfig(config?: Record<string, string> | null): Record<string, string> {
    if (!config) return {};
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (this.isPrivateConfigKey(key) && value && value.startsWith("enc:")) {
        decrypted[key] = this.decrypt(value);
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }

  private static isPrivateConfigKey(key: string) {
    return /apiKey|api_key|key|secret|token|password/i.test(key);
  }
}
