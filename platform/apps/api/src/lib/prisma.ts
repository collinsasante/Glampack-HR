import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient — avoids connection-pool exhaustion from re-instantiating
// per request (a real footgun with Prisma + hot-reloading dev servers).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Only "warn" here (slow queries, deprecations) — expected control-flow errors like a
// delete-by-missing-id are already caught and logged with real context by errorHandler.ts;
// letting Prisma also log them at "error" level would just double-log routine 404s/409s.
export const prisma = globalThis.__prisma ?? new PrismaClient({ log: ["warn"] });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
