import type { NextFunction, Request, Response } from "express";
import type { Employee } from "@prisma/client";
import type { DecodedIdToken } from "firebase-admin/auth";
import { firebaseAuth } from "../config/firebase-admin.js";
import { prisma } from "../lib/prisma.js";

declare global {
  namespace Express {
    interface Request {
      user?: Employee;
      /** Set by verifyFirebaseToken — a verified token with no Employee record resolved yet. */
      firebaseToken?: DecodedIdToken;
    }
  }
}

async function verifyBearerToken(req: Request): Promise<DecodedIdToken | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const idToken = header.slice("Bearer ".length);
  try {
    // checkRevoked adds a call to Firebase per request, but without it a token stays
    // valid for up to an hour after an admin deactivates the account or force-resets
    // a password — an unacceptable window for a system holding payroll/medical data.
    return await firebaseAuth().verifyIdToken(idToken, true);
  } catch {
    return null;
  }
}

// The single biggest security fix in this re-platform: today's Cloudflare Worker
// never verifies the Firebase ID token at all. Every authenticated route depends on this.
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const decoded = await verifyBearerToken(req);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });

  if (!decoded.email_verified) {
    return res.status(403).json({ error: "Email not verified" });
  }

  // Fall back to email lookup only during the Phase 3 migration grace period, for
  // employees whose firebaseUid hasn't been backfilled yet. Remove after cutover.
  let employee = await prisma.employee.findUnique({ where: { firebaseUid: decoded.uid } });
  if (!employee && decoded.email) {
    employee = await prisma.employee.findUnique({ where: { email: decoded.email.toLowerCase() } });
    if (employee && !employee.firebaseUid) {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: { firebaseUid: decoded.uid },
      });
    }
  }

  if (!employee) {
    return res.status(404).json({ error: "No employee record linked to this account" });
  }

  if (employee.accountStatus !== "Active") {
    return res.status(403).json({ error: "Account is inactive" });
  }

  req.user = employee;
  next();
}

// Used only by POST /auth/signup: proves the caller holds a real Firebase account
// (so signup can't be spoofed to an arbitrary email), deliberately WITHOUT requiring
// email verification or an existing Employee record — matching the old app's flow,
// where the Employee record is created immediately at signup, before the user has
// had a chance to click the verification link.
export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const decoded = await verifyBearerToken(req);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });
  if (!decoded.email) return res.status(400).json({ error: "Token has no associated email" });
  req.firebaseToken = decoded;
  next();
}
