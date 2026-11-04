import jwt from "jsonwebtoken";
import { env } from "../env";

export type JwtUser = { sub: string; role: string; name: string };

export function signAccessToken(userId: string, role: string, name: string) {
  const ttlMin = env.ACCESS_TOKEN_TTL_MIN;
  return jwt.sign({ role, name }, env.JWT_ACCESS_SECRET, { subject: userId, expiresIn: `${ttlMin}m` });
}

export function signRefreshToken(userId: string, role: string, name: string) {
  const ttlDays = env.REFRESH_TOKEN_TTL_DAYS;
  return jwt.sign({ role, name }, env.JWT_REFRESH_SECRET, { subject: userId, expiresIn: `${ttlDays}d` });
}

export function verifyAccess(token: string): JwtUser {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
  return { sub: payload.sub, role: payload.role, name: payload.name };
}

export function verifyRefresh(token: string): JwtUser {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
  return { sub: payload.sub, role: payload.role, name: payload.name };
}
