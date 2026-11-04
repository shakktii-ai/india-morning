
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, cert } = require('firebase-admin/app');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config();

const env = process.env;
const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) : null;

if (!serviceAccount) {
  console.log("No FIREBASE_SERVICE_ACCOUNT_KEY in .env. Checking for default...");
}

const app = initializeApp({
  credential: serviceAccount ? cert(serviceAccount) : undefined,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
});

const db = getFirestore(app);

async function check() {
  console.log("Checking tags collection...");
  try {
    const snap = await db.collection('tags').count().get();
    console.log("Total tags count:", snap.data().count);
    
    const sample = await db.collection('tags').limit(10).get();
    console.log("Sample Tags:");
    sample.forEach(doc => {
      console.log(`- ${doc.id}: ${doc.data().name}`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
