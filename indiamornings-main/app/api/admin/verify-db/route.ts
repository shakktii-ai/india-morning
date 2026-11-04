import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET() {
    try {
        // Attempt a lightweight operation
        // listCollections() is good but sometimes permissions are restrictive on root.
        // Try reading a known collection or just a dummy one.
        // .limit(1).get() on 'users' content.
        await db.collection("users").limit(1).get();

        // Also check if project ID is properly set
        const { getApp } = await import("firebase-admin/app");
        const projectId = getApp().options.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        return jsonOk({ status: "connected", projectId });
    } catch (e: any) {
        console.error("DB Verify Error:", e);
        return jsonError(e?.message || "Connection failed", 500);
    }
}
