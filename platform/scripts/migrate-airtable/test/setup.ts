import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

config({ path: fileURLToPath(new URL("../.env.test", import.meta.url)) });

// Real Firebase Admin credentials aren't available in this environment (and shouldn't
// be needed just to test the migration's transform/orchestration logic) — mock the
// listUsers() call to return no matches, exercising the "no firebaseUid backfill found"
// path that migrateEmployees already handles gracefully.
vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(() => ({})), cert: vi.fn() }));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ listUsers: async () => ({ users: [], pageToken: undefined }) }),
}));

// Avoid real network/AWS calls for the S3 re-upload step.
vi.mock("../src/s3-upload.js", () => ({
  reuploadAttachmentToS3: vi.fn(async (_url: string, filename: string) => ({
    s3Key: `medical-receipts/mock-${filename}`,
    url: `https://mock-bucket.s3.mock-region.amazonaws.com/medical-receipts/mock-${filename}`,
  })),
}));
