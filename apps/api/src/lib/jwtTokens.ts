import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export const signAccessToken = (secret: string, payload: AccessTokenPayload): string =>
  jwt.sign({ sub: payload.sub, email: payload.email }, secret, { expiresIn: "30d" });

export const verifyAccessToken = (secret: string, token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & { sub?: string; email?: string };
  if (typeof decoded.sub !== "string" || typeof decoded.email !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub: decoded.sub, email: decoded.email };
};
