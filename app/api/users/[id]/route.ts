import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";
import { requireUser, getRequestIp } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "JOURNALIST"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

    const input = patchSchema.parse(await req.json());
    if (input.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") return jsonError("Only SUPER_ADMIN can assign SUPER_ADMIN", 403);

    const { id } = await params;

    // Authorization check: Only SUPER_ADMIN can edit others' sensitive info, 
    // or ADMIN can edit their own/lower (though here we mostly care about SuperAdmin restrictions)

    const updateData: any = { ...input, updatedAt: new Date().toISOString() };

    if (input.password) {
      updateData.passwordHash = await bcrypt.hash(input.password, 12);
      delete updateData.password;
    }

    const docRef = db.collection("users").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return jsonError("Not found", 404);

    await docRef.update(updateData);

    // Fetch updated for response
    const updated = (await docRef.get()).data();

    const user = {
      id,
      name: updated?.name,
      email: updated?.email,
      role: updated?.role,
      isActive: updated?.isActive
    };

    await db.collection("audit_logs").add({
      actorId: actor.id,
      actorRole: actor.role as any,
      action: "USER_UPDATE",
      entity: "User",
      entityId: id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonOk({ user });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 400);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const { id } = await params;

    await db.collection("users").doc(id).delete();

    await db.collection("audit_logs").add({
      actorId: actor.id,
      actorRole: actor.role as any,
      action: "USER_DELETE",
      entity: "User",
      entityId: id,
      ip: await getRequestIp(),
      createdAt: new Date().toISOString()
    });

    return jsonOk({ message: "Deleted" });
  } catch (e: any) {
    return jsonError(e?.message || "Error", e?.status || 400);
  }
}
