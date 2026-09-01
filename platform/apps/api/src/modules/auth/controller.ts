import type { Request, Response } from "express";
import * as service from "./service.js";

export async function signUp(req: Request, res: Response) {
  const employee = await service.selfSignUp(req.firebaseToken!.uid, req.firebaseToken!.email!, req.body);
  res.status(201).json(employee);
}
