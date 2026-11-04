import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// You can use a service account JSON file, or environment variables.
// For Vercel/Cloud deployment, using environment variables for the service account is best.
// If you are just testing locally and don't have a service account yet, 
// you can rely on the default credential provider if you have 'gcloud auth application-default login' set up,
// OR use the project ID with specific env vars.

// Assuming minimal setup for now matching client config where possible, 
// but Admin SDK usually requires a Service Account (private key).
// If the user hasn't provided a Service Account, we might fail to init properly in production.
// For now, let's try the zero-arg init which works if GOOGLE_APPLICATION_CREDENTIALS is set,
// or fallback to a partial config if we only have the public keys (which is insufficient for Admin SDK usually).

// CRITICAL: Admin SDK requires a SERVICE ACCOUNT to function in most environments (except GCloud/Firebase Functions contexts).
// Since the user just converted from Prisma, they might not have this.
// However, I will code this to attempt standard init.

const firebaseAdminConfig = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // credential: ... (needs private key)
};

// We will export a lazy-initialized instance.
// If we are needing the private key, we assume it's in process.env.FIREBASE_SERVICE_ACCOUNT_KEY
// or similar.

function createAdminApp() {
    if (getApps().length > 0) {
        return getApp();
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "indiamorning";
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        try {
            // Some environments might have the key stringified differently, 
            // but standard JSON.parse should work for the single-line format.
            const serviceAccount = JSON.parse(serviceAccountKey);
            
            // Ensure private key newlines are handled if they were double-escaped
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            return initializeApp({
                credential: cert(serviceAccount),
                projectId: projectId,
            });
        } catch (error) {
            console.error("CRITICAL: Firebase Admin failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from environment.");
            console.error("Error details:", error instanceof Error ? error.message : error);
            // Do not proceed with invalid credentials
            throw new Error("Firebase Admin Initialization Failed: Invalid Service Account Key");
        }
    }

    // If we are here, no service account key was provided.
    // We only attempt default initialization if we are explicitly in a Google Cloud environment
    // or if the user has intentionally not provided a key.
    if (process.env.NODE_ENV === 'production') {
        console.warn("Firebase Admin: No service account key provided. Attempting default credentials (ADC)...");
    } else {
        console.warn("Firebase Admin: FIREBASE_SERVICE_ACCOUNT_KEY is missing from .env. Local development usually requires this.");
    }

    return initializeApp({
        projectId: projectId,
    });
}

export const adminApp = createAdminApp();
export const db = getFirestore(adminApp);
export const storage = getStorage(adminApp);
export const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ? storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
    : null;
