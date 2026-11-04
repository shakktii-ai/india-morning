import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";
import { requireUser } from "@/src/auth/requireUser";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await requireUser();
    const doc = await db.collection("users").doc(actor.id).get();

    if (!doc.exists) return jsonError("Not found", 404);

    const data = doc.data();
    const user = {
      id: doc.id,
      name: data?.name,
      email: data?.email,
      role: data?.role,
      isActive: data?.isActive
    };

    return jsonOk({ user });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
