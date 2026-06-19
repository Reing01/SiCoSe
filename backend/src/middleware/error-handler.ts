import type { NextFunction, Request, Response } from 'express'

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  const message = error instanceof Error ? error.message : 'Unexpected error'
  const statusCode = message.toLowerCase().includes('invalid') ? 400 : 500

  response.status(statusCode).json({
    error: message,
    code: statusCode,
  })
}
