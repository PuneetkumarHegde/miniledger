import crypto from 'node:crypto';

/**
 * Generates a cryptographically secure 6-digit OTP code (between 100000 and 999999).
 */
export function generateOtp(): string {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Computes a SHA-256 hash of the OTP for secure database storage.
 */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * Securely verifies an input OTP against its stored hash using timing-safe comparison.
 */
export function verifyOtpHash(inputCode: string, storedHash: string): boolean {
  const inputHash = hashOtp(inputCode);
  const bufA = Buffer.from(inputHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
