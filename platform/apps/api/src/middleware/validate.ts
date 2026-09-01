import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type Target = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: result.error.flatten() });
    }
    // Overwrite with the parsed (coerced/defaulted) value.
    (req as any)[target] = result.data;
    next();
  };
}
