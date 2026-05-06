export interface AuthUser {
  email: string;
  displayName: string;
}

export type AuthStep = "welcome" | "signIn" | "signUp";
