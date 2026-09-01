import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

// Loaded before any src module (env.ts's own `dotenv/config` call is a no-op
// once these are already set, since dotenv never overwrites existing vars).
config({ path: fileURLToPath(new URL("../.env.test", import.meta.url)) });

// We deliberately don't spin up the real Firebase Auth emulator here (it needs
// a JVM + network fetch of emulator binaries, impractical in this environment).
// Instead we stub verifyIdToken to decode a base64url-JSON "fake token" produced
// by test/fakeToken.ts. This still exercises the real `authenticate` middleware
// logic end-to-end (employee lookup, accountStatus check, RBAC) — only the actual
// Firebase network call is faked.
vi.mock("../src/config/firebase-admin.js", () => ({
  firebaseAuth: () => ({
    verifyIdToken: async (token: string) => {
      try {
        return JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
      } catch {
        throw new Error("Invalid token");
      }
    },
  }),
}));
