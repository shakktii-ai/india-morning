
import { db } from "@/src/lib/firebase-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    let content = "google.com, pub-7831391181692806, DIRECT, f08c47fec0942fa0"; // Default fallback

    try {
        const doc = await db.collection("system_configs").doc("ads_txt_content").get();
        const data = doc.data();
        if (data && data.value) {
            content = data.value;
        }
    } catch (e) { }

    return new NextResponse(content, {
        headers: {
            "Content-Type": "text/plain",
        },
    });
}
