import { storage } from "@/src/lib/firebase-admin";
import { jsonError, jsonOk } from "@/src/utils/http";
import { requireUser } from "@/src/auth/requireUser";
import { requireRole } from "@/src/auth/rbac";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const actor = await requireUser();
        requireRole(actor.role, ["SUPER_ADMIN", "ADMIN", "JOURNALIST"]);

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return jsonError("No file provided", 400);
        }

        // Basic validation
        if (!file.type.startsWith("image/")) {
            return jsonError("Only image files are allowed", 400);
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            return jsonError("File size exceeds 5MB limit", 400);
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split(".").pop();
        const filename = `articles/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        console.log("Attempting upload to bucket:", bucketName); // DEBUG LOG
        if (!bucketName) {
            return jsonError("Storage bucket configuration missing", 500);
        }

        const bucket = storage.bucket(bucketName);
        const fileRef = bucket.file(filename);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            }
        });

        await fileRef.makePublic();

        // Construct public URL
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

        return jsonOk({ url: publicUrl });

    } catch (e: any) {
        console.error("Upload Error:", e);
        return jsonError(e.message || "Upload failed", 500);
    }
}

export async function DELETE(req: Request) {
    try {
        const actor = await requireUser();
        requireRole(actor.role, ["SUPER_ADMIN", "ADMIN", "JOURNALIST"]);

        const url = new URL(req.url);
        const fileUrl = url.searchParams.get("url");

        if (!fileUrl) {
            return jsonError("No URL provided", 400);
        }

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            return jsonError("Storage bucket configuration missing", 500);
        }

        // Extract filename from the public URL
        // Format: https://storage.googleapis.com/bucket-name/articles/filename.ext
        const prefix = `https://storage.googleapis.com/${bucketName}/`;
        if (!fileUrl.startsWith(prefix)) {
            return jsonError("Invalid file URL", 400);
        }

        const filename = fileUrl.replace(prefix, "");
        const bucket = storage.bucket(bucketName);
        const fileRef = bucket.file(filename);

        const [exists] = await fileRef.exists();
        if (!exists) {
            return jsonError("File does not exist", 404);
        }

        await fileRef.delete();

        return jsonOk({ message: "File deleted successfully" });

    } catch (e: any) {
        console.error("Delete Error:", e);
        return jsonError(e.message || "Delete failed", 500);
    }
}
