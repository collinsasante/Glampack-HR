import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Role } from "@glampack/shared";
import { app } from "../src/app.js";
import { resetDb } from "./db.js";
import { createTestEmployee } from "./fixtures.js";

beforeEach(resetDb);

const ROLES: Role[] = ["Employee", "Admin", "HR", "Manager"];

// Every route the live Cloudflare Worker exposes with *zero* server-side authorization
// today. This is the single highest-value test in Phase 1: for each (route, role) pair,
// assert the new API actually enforces the intended gate instead of letting anyone through.
const CASES: { method: "get" | "post" | "patch" | "delete"; path: string; allowed: Role[] }[] = [
  { method: "get", path: "/api/v1/employees", allowed: ["Admin", "HR", "Manager"] },
  { method: "post", path: "/api/v1/employees", allowed: ["Admin", "HR"] },
  { method: "post", path: "/api/v1/announcements", allowed: ["Admin", "HR"] },
  { method: "get", path: "/api/v1/announcements/reads/counts", allowed: ["Admin", "HR", "Manager"] },
  { method: "post", path: "/api/v1/payroll", allowed: ["Admin", "HR"] },
  { method: "delete", path: "/api/v1/payroll/nonexistent-id", allowed: ["Admin"] },
];

describe("RBAC matrix", () => {
  for (const { method, path, allowed } of CASES) {
    for (const role of ROLES) {
      const shouldAllow = allowed.includes(role);
      it(`${method.toUpperCase()} ${path} — ${role} is ${shouldAllow ? "allowed" : "blocked"}`, async () => {
        const { authHeader } = await createTestEmployee({ role });
        const req = request(app)[method](path).set("Authorization", authHeader);
        const res = method === "get" ? await req : await req.send({});

        if (shouldAllow) {
          expect(res.status).not.toBe(403);
        } else {
          expect(res.status).toBe(403);
        }
      });
    }
  }

  it("blocks every route entirely with no Authorization header", async () => {
    for (const { method, path } of CASES) {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    }
  });

  it("blocks a request from a deactivated (Inactive) account", async () => {
    const { authHeader, employee } = await createTestEmployee({ role: "Admin" });
    const { prisma } = await import("../src/lib/prisma.js");
    await prisma.employee.update({ where: { id: employee.id }, data: { accountStatus: "Inactive" } });

    const res = await request(app).get("/api/v1/employees").set("Authorization", authHeader);
    expect(res.status).toBe(403);
  });
});
