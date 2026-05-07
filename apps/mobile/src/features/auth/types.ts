export interface AuthUser {
  email: string;
  displayName: string;
}

export type AuthStep = "signIn" | "signUp";
