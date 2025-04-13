import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  // Add password complexity rules (e.g., min length, numbers, symbols) as needed
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  name: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
