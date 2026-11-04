import { db } from "@/src/lib/firebase-admin";
import { getErrorMessage, jsonCreated, jsonError, jsonOk } from "@/src/utils/http";


import { requireUser, getRequestIp } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "JOURNALIST"]).default("JOURNALIST")
});

export async function GET() {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        email: d.email,
        role: d.role,
        isActive: d.isActive,
        createdAt: d.createdAt,
        lastLoginAt: d.lastLoginAt
      };
    });

    return jsonOk({ users });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 500);
  }
}

export async function POST(req: Request) {
  try {
    const actor = requireUser();
    const actorUser = await actor;
    requireRole(actorUser.role, ["SUPER_ADMIN"]);
    const input = createSchema.parse(await req.json());

    const q = await db.collection("users").where("email", "==", input.email).get();
    if (!q.empty) return jsonError("Email already exists", 409);

    const passwordHash = await bcrypt.hash(input.password, 12);

    const newUser = {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection("users").add(newUser);

    await db.collection("audit_logs").add({
      actorId: actorUser.id,
      actorRole: actorUser.role as any,
      action: "USER_CREATE",
      entity: "User",
      entityId: docRef.id,
      ip: await getRequestIp() ?? "0.0.0.0",
      createdAt: new Date().toISOString()
    });

    return jsonCreated({ user: { id: docRef.id, name: newUser.name, email: newUser.email, role: newUser.role } });
  } catch (e: any) {
    return jsonError(getErrorMessage(e), e?.status || 400);
  }
}
