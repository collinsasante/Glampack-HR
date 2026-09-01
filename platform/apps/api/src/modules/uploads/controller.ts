import type { Request, Response } from "express";
import { z } from "zod";
import { presignUpload } from "../../lib/s3.js";

const presignSchema = z.object({ contentType: z.string().min(1) });

export async function presignMedicalReceipt(req: Request, res: Response) {
  const { contentType } = presignSchema.parse(req.body);
  res.json(await presignUpload("medical-receipts", contentType));
}

export async function presignAnnouncementImage(req: Request, res: Response) {
  const { contentType } = presignSchema.parse(req.body);
  res.json(await presignUpload("announcement-images", contentType));
}
