export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export type AuthStep = "signIn" | "signUp";
