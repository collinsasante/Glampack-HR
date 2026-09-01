import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Glampack HR API listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Don't hang forever waiting on in-flight requests (e.g. a stuck DB query).
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  // An uncaught exception means we're in an unknown state — fail fast rather
  // than keep serving traffic on a process that might be silently corrupted.
  logger.fatal({ err }, "Uncaught exception, exiting");
  process.exit(1);
});
