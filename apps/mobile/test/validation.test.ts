import { describe, expect, test } from "bun:test";

import {
  validateDisplayName,
  validateEmail,
  validatePassword,
} from "../src/features/auth/validation";

describe("auth validation", () => {
  test("validateEmail rejects empty and invalid addresses", () => {
    expect(validateEmail("")).toBe("Enter your email.");
    expect(validateEmail("not-an-email")).toBe("Enter a valid email address.");
    expect(validateEmail("user@example.com")).toBeNull();
  });

  test("validatePassword enforces minimum length", () => {
    expect(validatePassword("")).toBe("Enter your password.");
    expect(validatePassword("short")).toBe("Use at least 8 characters.");
    expect(validatePassword("longenough")).toBeNull();
  });

  test("validateDisplayName requires trimmed length", () => {
    expect(validateDisplayName("")).toBe("Enter your name.");
    expect(validateDisplayName("A")).toBe("Use at least 2 characters.");
    expect(validateDisplayName("Alex")).toBeNull();
  });
});
