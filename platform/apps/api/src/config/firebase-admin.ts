import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "./env.js";

let app: App;

// FIREBASE_SERVICE_ACCOUNT_JSON holds the full service-account JSON as a string
// (e.g. from a Docker/VPS secret), not a file path — avoids shipping a credentials file.
function getFirebaseApp(): App {
  if (!app) {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0]!;
    } else {
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      app = initializeApp({ credential: cert(serviceAccount) });
    }
  }
  return app;
}

export const firebaseAuth = () => getAuth(getFirebaseApp());
