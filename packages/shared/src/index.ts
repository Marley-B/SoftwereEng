import { z } from "zod";

/** User registration request. */
export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(120)
});

/** User login request. */
export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

/** Authenticated user data. */
export const authUserDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1)
});

/** Response for registration and login. */
export const authResponseSchema = z.object({
  token: z.string().min(1),
  user: authUserDtoSchema
});

export type AuthUserDto = z.infer<typeof authUserDtoSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
