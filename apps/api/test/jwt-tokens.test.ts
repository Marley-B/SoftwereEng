import { describe, expect, test } from "bun:test";
import { signAccessToken, verifyAccessToken } from "../src/lib/jwtTokens.js";

describe("jwtTokens", () => {
  const secret = "test-secret-at-least-32-chars-long!!";

  test("sign then verify restores payload", () => {
    const token = signAccessToken(secret, { sub: "user-uuid-1234", email: "a@b.co" });
    const payload = verifyAccessToken(secret, token);
    expect(payload.sub).toBe("user-uuid-1234");
    expect(payload.email).toBe("a@b.co");
  });

  test("wrong secret rejects", () => {
    const token = signAccessToken(secret, { sub: "u1", email: "x@y.z" });
    expect(() => verifyAccessToken("other-secret-not-same-as-above!!", token)).toThrow();
  });
});
