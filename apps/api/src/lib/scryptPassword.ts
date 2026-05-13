import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

/** Deterministic slow hash suitable for password storage (no native bcrypt tarball). */
export const hashPassword = (plain: string): string => {
  const salt = randomBytes(16);
  const key = scryptSync(plain, salt, KEY_LEN);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
};

export const verifyPassword = (plain: string, stored: string): boolean => {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const derived = scryptSync(plain, salt, expected.length);
  return timingSafeEqual(derived, expected);
};
