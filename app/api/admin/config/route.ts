import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";
import { requireUser } from "@/src/auth/requireUser";

export const runtime = "nodejs";

export async function GET() {
    try {
        const user = await requireUser();
        if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") return jsonError("Forbidden", 403);

        const snaps = await db.collection("system_configs").get();
        const configs = snaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return jsonOk({ configs });
    } catch (e: any) {
        return jsonError(e.message, 500);
    }
}

export async function POST(req: Request) {
    try {
        const user = await requireUser();
        if (user.role !== "SUPER_ADMIN") return jsonError("Only Super Admins can update system settings", 403);

        const { key, value } = await req.json();
        if (!key) return jsonError("Missing key", 400);

        await db.collection("system_configs").doc(key).set({
            key,
            value,
            updatedAt: new Date().toISOString()
        });

        return jsonOk({ message: "Setting updated" });
    } catch (e: any) {
        return jsonError(e.message, 500);
    }
}
