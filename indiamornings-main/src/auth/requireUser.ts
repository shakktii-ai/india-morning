import { headers } from "next/headers";
import { getAuthCookies } from "./cookies";
import { verifyAccess } from "./jwt";
import { validateApiKey } from "./apiKey";

export async function getRequestIp(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
}

export async function requireUser() {
  const { access } = await getAuthCookies();

  // If session cookie exists, use it (Original flow)
  if (access) {
    try {
      const payload = verifyAccess(access);
      return { id: payload.sub, role: payload.role, name: payload.name };
    } catch (e) {
      // Cookie is invalid or expired, continue to check API key
    }
  }

  // Fallback to API Key
  const h = await headers();
  const apiKey = h.get("x-api-key");
  if (apiKey) {
    const apiActor = await validateApiKey(apiKey);
    if (apiActor) {
      return apiActor;
    }
  }

  const err = new Error("Unauthorized");
  (err as any).status = 401;
  throw err;
}
