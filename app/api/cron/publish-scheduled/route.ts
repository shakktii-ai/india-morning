import { db } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = req.headers.get("x-cron-secret") || searchParams.get("secret");
        const isVercelCron = req.headers.get("x-vercel-cron") === "1";

        // Basic security check: allow if secret matches OR if it's a verified Vercel Cron request
        if (process.env.CRON_SECRET) {
            console.log("CRON_SECRET is configured. Checking provided secret...");
            if (secret !== process.env.CRON_SECRET && !isVercelCron) {
                console.warn(`Unauthorized cron attempt. Expected secret or Vercel Cron.`);
                return jsonError("Unauthorized: Incorrect secret or not a valid cron trigger", 401);
            }
        } else if (!isVercelCron) {
            console.log("CRON_SECRET is not configured and not Vercel Cron. Proceeding with caution...");
        }

        const now = new Date().toISOString();
        const snapshot = await db.collection("articles")
            .where("status", "==", "SCHEDULED")
            .get();

        // Filter in-memory to avoid needing a Firestore composite index
        const docsToPublish = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.scheduledAt && data.scheduledAt <= now;
        });

        if (docsToPublish.length === 0) {
            return jsonOk({ message: "No articles to publish", count: 0 });
        }

        const batch = db.batch();
        const publishedIds: string[] = [];
        const publishedTitles: string[] = [];

        docsToPublish.forEach((doc) => {
            const data = doc.data();
            batch.update(doc.ref, {
                status: "PUBLISHED",
                publishedAt: now,
                updatedAt: now
            });
            publishedIds.push(doc.id);
            publishedTitles.push(data.title || "Untitled");
        });

        await batch.commit();

        // Audit logs for system actions
        const auditPromises = publishedIds.map(id =>
            db.collection("audit_logs").add({
                actorId: "SYSTEM",
                actorRole: "CRON",
                action: "ARTICLE_PUBLISH_SCHEDULED",
                entity: "Article",
                entityId: id,
                ip: "127.0.0.1",
                createdAt: now
            })
        );

        await Promise.all(auditPromises);

        return jsonOk({
            message: `Successfully published ${publishedIds.length} articles`,
            count: publishedIds.length,
            ids: publishedIds,
            titles: publishedTitles
        });

    } catch (e: any) {
        console.error("Cron Publish Error:", e);
        return jsonError(e?.message || "Internal Server Error", 500);
    }
}
