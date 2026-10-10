import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export function validateRequest(schemas: {
  params?: AnyZodObject;
  query?: AnyZodObject;
  body?: AnyZodObject;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
