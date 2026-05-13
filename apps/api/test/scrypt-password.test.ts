import { describe, expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "../src/lib/scryptPassword.js";

describe("scryptPassword", () => {
  test("verifyPassword accepts hash from hashPassword", () => {
    const h = hashPassword("my-password-123");
    expect(verifyPassword("my-password-123", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
  });
});
