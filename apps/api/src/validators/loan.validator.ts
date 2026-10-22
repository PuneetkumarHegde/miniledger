import { z } from 'zod';

export const createLoanSchema = z.object({
  friendName: z
    .string()
    .trim()
    .min(1, "Friend's name is required")
    .max(100, "Friend's name must be at most 100 characters"),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Loan amount must be a valid number greater than 0',
    })
    .refine((val) => Number(val.toFixed(2)) === val || /^\d+(\.\d{1,2})?$/.test(val.toString()), {
      message: 'Loan amount cannot have more than 2 decimal places',
    }),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Due date must be a valid date string',
    }),
  receiptUrl: z.string().optional().nullable(),
  receiptOriginalName: z.string().optional().nullable(),
  receiptMimeType: z.string().optional().nullable(),
  receiptSize: z.number().int().optional().nullable(),
});

export const loanIdParamSchema = z.object({
  id: z.string().min(1, 'Loan ID is required'),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
