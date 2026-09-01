import { Router } from "express";
import { checkInSchema, checkOutSchema, listAttendanceQuerySchema } from "@glampack/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const attendanceRouter = Router();

attendanceRouter.use(authenticate);

attendanceRouter.get("/", validate(listAttendanceQuerySchema, "query"), asyncHandler(controller.list));
attendanceRouter.post("/check-in", validate(checkInSchema), asyncHandler(controller.checkIn));
attendanceRouter.post("/check-out", validate(checkOutSchema), asyncHandler(controller.checkOut));
