import { db } from "@/src/lib/firebase-admin";
import bcrypt from "bcryptjs";
import { env } from "@/src/env";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = body?.bootstrapKey;
    if (!key || key !== env.BOOTSTRAP_KEY) return jsonError("Invalid bootstrap key", 401);

    const email = env.SUPERADMIN_EMAIL || body?.email;
    const password = env.SUPERADMIN_PASSWORD || body?.password;
    const name = env.SUPERADMIN_NAME || body?.name || "Super Admin";

    if (!email || !password) return jsonError("Missing email/password", 400);

    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).get();

    if (!snapshot.empty) return jsonOk({ message: "Super admin already exists", email });

    const passwordHash = await bcrypt.hash(password, 12);
    // Use email as ID or auto-gen ID? Let's use auto-gen ID for flexibility, but query by email.
    // Actually, usually users are keyed by UID. But here we are making custom users.

    await usersRef.add({
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return jsonOk({ message: "Super admin created", email });
  } catch (e: any) {
    console.error("Bootstrap Error:", e);
    return jsonError(e?.message || "Server error", e?.status || 500);
  }
}
