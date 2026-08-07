import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = statusCode < 500 ? err.message : 'Internal Server Error';

  if (env.nodeEnv === 'development') {
    console.error(err);
  }

  res.status(statusCode).json({
    error: err.code || 'SERVER_ERROR',
    message,
    ...(env.nodeEnv === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
};

export const createError = (message: string, statusCode: number, code?: string): AppError => {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

export const notFound = (_req: Request, _res: Response, next: NextFunction): void => {
  next(createError('Route not found', 404, 'NOT_FOUND'));
};
