import admin from "firebase-admin";
import fs from "fs";

export function initFirebase() {
  if (admin.apps.length) return admin;

  // Option A (recommended for deploy): env contains the JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  }

  // Option B (dev): read local file path from env
  // put path like: ./secrets/firebase-service-account.json
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8");
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  }

  throw new Error("Firebase service account not configured");
}

export { admin };
