import { db } from "@/src/lib/firebase-admin";

export interface ApiKeyData {
    id: string;
    name: string;
    key: string;
    role: string;
    createdAt: string;
    lastUsedAt?: string;
    isActive: boolean;
}

export async function validateApiKey(apiKey: string): Promise<{ id: string, role: string, name: string } | null> {
    if (!apiKey) return null;

    try {
        const snapshot = await db.collection("api_keys")
            .where("key", "==", apiKey)
            .where("isActive", "==", true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data() as ApiKeyData;

        // Update lastUsedAt asynchronously (don't block the request)
        db.collection("api_keys").doc(doc.id).update({
            lastUsedAt: new Date().toISOString()
        }).catch(err => console.error("Error updating API key lastUsedAt:", err));

        return {
            id: doc.id, // Using doc ID as user ID for API key requests
            role: data.role || "API_SERVICE",
            name: data.name
        };
    } catch (error) {
        console.error("Error validating API key:", error);
        return null;
    }
}
