import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";
import { getAuthCookies, setAuthCookies } from "@/src/auth/cookies";
import { verifyRefresh, signAccessToken, signRefreshToken } from "@/src/auth/jwt";
import crypto from "crypto";
import { env } from "@/src/env";

export const runtime = "nodejs";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST() {
  try {
    const { refresh } = await getAuthCookies();
    if (!refresh) return jsonError("Missing refresh token", 401);

    const payload = verifyRefresh(refresh);

    // Check Refresh Token in Firestore
    const hash = sha256(refresh);
    const q = await db.collection("refresh_tokens").where("tokenHash", "==", hash).limit(1).get();

    if (q.empty) return jsonError("Refresh token revoked", 401);

    const tokenDoc = q.docs[0];
    const tokenData = tokenDoc.data();

    if (tokenData.revokedAt) return jsonError("Refresh token revoked", 401);
    if (new Date(tokenData.expiresAt).getTime() < Date.now()) return jsonError("Refresh token expired", 401);

    // Get User
    const userDoc = await db.collection("users").doc(payload.sub).get(); // payload.sub is userId
    if (!userDoc.exists) return jsonError("User not found", 401);
    const user = { id: userDoc.id, ...userDoc.data() } as any;

    if (!user.isActive) return jsonError("User not found", 401);

    const newAccess = signAccessToken(user.id, user.role, user.name);
    const newRefresh = signRefreshToken(user.id, user.role, user.name);

    // Revoke old
    await tokenDoc.ref.update({ revokedAt: new Date().toISOString() });

    const ttlDays = env.REFRESH_TOKEN_TTL_DAYS;
    await db.collection("refresh_tokens").add({
      tokenHash: sha256(newRefresh),
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * ttlDays).toISOString(),
      createdAt: new Date().toISOString()
    });

    await setAuthCookies(newAccess, newRefresh);
    return jsonOk({ message: "Refreshed" });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 401);
  }
}
