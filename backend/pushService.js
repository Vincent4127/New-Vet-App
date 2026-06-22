import { admin } from "./firebaseAdmin.js";

export async function sendPushToToken(token, { title, body, data }) {
  if (!token) throw new Error("Missing FCM token");

  const message = {
    token,
    notification: {
      title: title || "Vet App",
      body: body || "",
    },
    // data must be strings
    data: Object.fromEntries(
      Object.entries(data || {}).map(([k, v]) => [k, String(v)])
    ),
    android: { priority: "high" },
    apns: { headers: { "apns-priority": "10" } },
  };

  return admin.messaging().send(message);
}
