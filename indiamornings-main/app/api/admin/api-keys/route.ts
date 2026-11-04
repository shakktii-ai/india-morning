import { db } from "@/src/lib/firebase-admin";
import { requireUser, getRequestIp } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";
import { jsonOk, jsonError, jsonCreated } from "@/src/utils/http";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET() {
    try {
        const actor = await requireUser();
        requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

        const snapshot = await db.collection("api_keys").orderBy("createdAt", "desc").get();
        const keys = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return jsonOk({ keys });
    } catch (e: any) {
        return jsonError(e.message, e.status || 500);
    }
}

export async function POST(req: Request) {
    try {
        const actor = await requireUser();
        requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

        const { name, role } = await req.json();
        if (!name) return jsonError("Name is required", 400);

        const key = `im_${crypto.randomUUID().replace(/-/g, "")}`;
        const newKey = {
            name,
            key,
            role: role || "API_SERVICE",
            createdAt: new Date().toISOString(),
            isActive: true,
            createdBy: actor.id
        };

        const docRef = await db.collection("api_keys").add(newKey);

        await db.collection("audit_logs").add({
            actorId: actor.id,
            actorRole: actor.role,
            action: "API_KEY_CREATE",
            entity: "ApiKey",
            entityId: docRef.id,
            ip: await getRequestIp(),
            createdAt: new Date().toISOString()
        });

        return jsonCreated({ id: docRef.id, ...newKey });
    } catch (e: any) {
        return jsonError(e.message, e.status || 500);
    }
}

export async function DELETE(req: Request) {
    try {
        const actor = await requireUser();
        requireRole(actor.role, ["SUPER_ADMIN", "ADMIN"]);

        const { id } = await req.json();
        if (!id) return jsonError("ID is required", 400);

        await db.collection("api_keys").doc(id).delete();

        await db.collection("audit_logs").add({
            actorId: actor.id,
            actorRole: actor.role,
            action: "API_KEY_DELETE",
            entity: "ApiKey",
            entityId: id,
            ip: await getRequestIp(),
            createdAt: new Date().toISOString()
        });

        return jsonOk({ message: "API key deleted" });
    } catch (e: any) {
        return jsonError(e.message, e.status || 500);
    }
}
