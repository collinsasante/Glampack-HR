import type { Request, Response } from "express";
import * as officesService from "./service.js";

export async function list(_req: Request, res: Response) {
  res.json(await officesService.listOffices());
}

export async function create(req: Request, res: Response) {
  const office = await officesService.createOffice(req.body);
  res.status(201).json(office);
}

export async function update(req: Request, res: Response) {
  const office = await officesService.updateOffice(req.params.id!, req.body);
  res.json(office);
}

export async function remove(req: Request, res: Response) {
  await officesService.deleteOffice(req.params.id!);
  res.status(204).end();
}
