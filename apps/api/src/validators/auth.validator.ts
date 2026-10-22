import { z } from 'zod';

export function normalizePhoneNumber(raw: string): string {
  // Remove all whitespace, dashes, and parentheses
  const cleaned = raw.trim().replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If 10 digits, assume standard Indian phone number and prepend +91
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  return cleaned;
}

export const requestOtpSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .transform(normalizePhoneNumber)
    .refine((val) => /^\+[1-9]\d{7,14}$/.test(val), {
      message: 'Invalid phone number format. Must be a valid E.164 phone number (e.g., +919876543210)',
    }),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .transform(normalizePhoneNumber)
    .refine((val) => /^\+[1-9]\d{7,14}$/.test(val), {
      message: 'Invalid phone number format',
    }),
  otp: z
    .string()
    .trim()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
