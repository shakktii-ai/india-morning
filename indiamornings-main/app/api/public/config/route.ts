import { db } from "@/src/lib/firebase-admin";
import { jsonOk } from "@/src/utils/http";

export const runtime = "nodejs";

export async function GET() {
    const configs: Record<string, string> = {};

    // Only expose public safe configs
    const publicKeys = ["ads_txt_content"];

    const snaps = await db.collection("system_configs").where("key", "in", publicKeys).get();
    snaps.forEach(doc => {
        configs[doc.data().key] = doc.data().value;
    });

    return jsonOk({ configs });
}
