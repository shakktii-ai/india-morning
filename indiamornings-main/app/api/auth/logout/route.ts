import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";
import { clearAuthCookies, getAuthCookies } from "@/src/auth/cookies";
import crypto from "crypto";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST() {
  try {
    const { refresh } = await getAuthCookies();
    if (refresh) {
      const hash = sha256(refresh);
      const q = await db.collection("refresh_tokens").where("tokenHash", "==", hash).limit(1).get();
      if (!q.empty) {
        await q.docs[0].ref.update({ revokedAt: new Date().toISOString() });
      }
    }
    await clearAuthCookies();
  } catch {
    return jsonError("Server error", 500);
  }

  return redirect("/admin/login");
}
