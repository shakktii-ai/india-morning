import { db } from "@/src/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getErrorMessage, jsonError, jsonOk } from "@/src/utils/http";
import { signAccessToken, signRefreshToken } from "@/src/auth/jwt";
import { setAuthCookies } from "@/src/auth/cookies";
import crypto from "crypto";
import { env } from "@/src/env";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const input = schema.parse(await req.json());

    // Firestore User Lookup
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", input.email).limit(1).get();

    if (snapshot.empty) return jsonError("Invalid credentials", 401);

    const doc = snapshot.docs[0];
    const user = { id: doc.id, ...doc.data() } as any;

    if (!user.isActive) return jsonError("Invalid credentials", 401);

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) return jsonError("Invalid credentials", 401);

    const access = signAccessToken(user.id, user.role, user.name);
    const refresh = signRefreshToken(user.id, user.role, user.name);

    const ttlDays = env.REFRESH_TOKEN_TTL_DAYS;

    // Store Refresh Token in Firestore
    await db.collection("refresh_tokens").add({
      tokenHash: sha256(refresh),
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * ttlDays).toISOString(),
      createdAt: new Date().toISOString()
    });

    // Update Last Login
    await usersRef.doc(user.id).update({ lastLoginAt: new Date().toISOString() });

    await setAuthCookies(access, refresh);
    return jsonOk({ message: "Logged in", user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e: any) {
    return jsonError(getErrorMessage(e), e?.status || 400);
  }
}
