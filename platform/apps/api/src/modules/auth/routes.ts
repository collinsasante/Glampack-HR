import { Router } from "express";
import { signUpSchema } from "@glampack/shared";
import { verifyFirebaseToken } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as controller from "./controller.js";

export const authRouter = Router();

authRouter.post("/signup", verifyFirebaseToken, validate(signUpSchema), asyncHandler(controller.signUp));
