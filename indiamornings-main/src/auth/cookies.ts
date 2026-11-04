import { cookies } from "next/headers";

export const ACCESS_COOKIE = "im_access";
export const REFRESH_COOKIE = "im_refresh";

const isProd = process.env.NODE_ENV === "production";

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const jar = await cookies();
  const ONE_DAY = 60 * 60 * 24;
  jar.set(ACCESS_COOKIE, accessToken, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: ONE_DAY });
  jar.set(REFRESH_COOKIE, refreshToken, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: ONE_DAY });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 0 });
  jar.set(REFRESH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 0 });
}

export async function getAuthCookies() {
  const jar = await cookies();
  return {
    access: jar.get(ACCESS_COOKIE)?.value,
    refresh: jar.get(REFRESH_COOKIE)?.value
  };
}
