import type { Request, Response, NextFunction } from 'express';
import { updateContext } from "../context/app_context.js";

export const helperContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await updateContext();
    next();
  } catch (err) {
    next(err); 
  }
};