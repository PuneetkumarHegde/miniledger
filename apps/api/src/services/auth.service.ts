import { prisma } from '../lib/prisma.js';
import { generateOtp, hashOtp, verifyOtpHash } from '../lib/crypto.js';
import { signToken } from '../lib/jwt.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';

export class AuthService {
  /**
   * Generates a 6-digit OTP, prints it to the terminal for development/testing,
   * hashes it, and stores the hash in the database with an expiry window.
   */
  static async requestOtp(phoneNumber: string): Promise<{ success: boolean; message: string; expiresInSeconds: number }> {
    const rawOtp = generateOtp();
    const codeHash = hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any previously active unconsumed OTPs for this phone number
    await prisma.otp.updateMany({
      where: {
        phoneNumber,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    // Create new OTP record with hash only (no raw code persisted)
    await prisma.otp.create({
      data: {
        phoneNumber,
        codeHash,
        expiresAt,
        attemptCount: 0,
      },
    });

    // Output mock OTP to the server console as required
    console.log('\n======================================================');
    console.log(`🔑 [AUTH SERVICE] MOCK OTP FOR ${phoneNumber}`);
    console.log(`👉 CODE: >>> ${rawOtp} <<<`);
    console.log(`⏰ Valid for ${env.OTP_EXPIRY_MINUTES} minutes (expires at: ${expiresAt.toLocaleTimeString()})`);
    console.log('======================================================\n');

    return {
      success: true,
      message: 'OTP sent successfully. Please check server console in development.',
      expiresInSeconds: env.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Verifies the provided OTP against the latest record, enforces attempt limits,
   * marks the OTP as consumed, creates or fetches the user, and returns a signed session token.
   */
  static async verifyOtp(phoneNumber: string, inputOtp: string) {
    const record = await prisma.otp.findFirst({
      where: {
        phoneNumber,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record) {
      throw new AppError('No active OTP request found for this phone number. Please request a new OTP.', 400);
    }

    // Check expiration
    if (new Date() > record.expiresAt) {
      await prisma.otp.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    // Check attempt limits
    if (record.attemptCount >= env.MAX_OTP_ATTEMPTS) {
      await prisma.otp.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      throw new AppError('Too many failed verification attempts. Please request a new OTP.', 429);
    }

    // Check code match
    const isValid = verifyOtpHash(inputOtp, record.codeHash);
    if (!isValid) {
      await prisma.otp.update({
        where: { id: record.id },
        data: { attemptCount: { increment: 1 } },
      });
      const remainingAttempts = env.MAX_OTP_ATTEMPTS - (record.attemptCount + 1);
      throw new AppError(`Invalid OTP code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new OTP.'}`, 400);
    }

    // Mark OTP as consumed (one-time-use)
    await prisma.otp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    // Create or retrieve user
    const user = await prisma.user.upsert({
      where: { phoneNumber },
      update: {},
      create: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    // Generate signed session token
    const token = signToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
    });

    return {
      token,
      user,
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}
