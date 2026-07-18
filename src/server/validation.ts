import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type RequestPart = "body" | "params" | "query";

export function validateRequest<T>(part: RequestPart, schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      next(result.error);
      return;
    }

    req[part] = result.data as Request[RequestPart];
    next();
  };
}
