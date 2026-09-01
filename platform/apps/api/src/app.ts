import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/routes.js";
import { employeesRouter } from "./modules/employees/routes.js";
import { attendanceRouter } from "./modules/attendance/routes.js";
import { leaveRequestsRouter } from "./modules/leave-requests/routes.js";
import {
  announcementCommentsRouter,
  announcementsRouter,
} from "./modules/announcements/routes.js";
import { payrollRouter } from "./modules/payroll/routes.js";
import { medicalClaimsRouter } from "./modules/medical-claims/routes.js";
import {
  emergencyContactsRouter,
  nestedEmergencyContactsRouter,
} from "./modules/emergency-contacts/routes.js";
import { uploadsRouter } from "./modules/uploads/routes.js";

export const app = express();

// The app sits behind nginx on the VPS (Phase 4) — without this, express-rate-limit
// and req.ip both see nginx's address instead of the real client's.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

if (env.NODE_ENV !== "test") {
  // Excludes /health and /ready — an orchestrator/load balancer polls these every
  // few seconds, and logging each hit would just drown out real request traffic.
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" },
    })
  );
}

// A generous, general-purpose ceiling — not a substitute for Firebase's own
// auth throttling, but the live Cloudflare Worker today has no rate limiting
// at all (a known issue called out in the project's own CLAUDE.md).
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Liveness: process is up, no dependency checks.
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Readiness: safe for a load balancer / orchestrator to gate traffic on.
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch (err) {
    logger.error({ err }, "Readiness check failed");
    res.status(503).json({ status: "not ready" });
  }
});

const v1 = express.Router();
v1.use("/auth", authRouter);
v1.use("/employees", employeesRouter);
v1.use("/employees/:employeeId/emergency-contacts", nestedEmergencyContactsRouter);
v1.use("/emergency-contacts", emergencyContactsRouter);
v1.use("/attendance", attendanceRouter);
v1.use("/leave-requests", leaveRequestsRouter);
v1.use("/announcements", announcementsRouter);
v1.use("/announcement-comments", announcementCommentsRouter);
v1.use("/payroll", payrollRouter);
v1.use("/medical-claims", medicalClaimsRouter);
v1.use("/uploads", uploadsRouter);

app.use("/api/v1", v1);

app.use(errorHandler);
