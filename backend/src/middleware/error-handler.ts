import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'

const INTERNAL_ERROR_MESSAGE = 'No fue posible completar la solicitud.'
const BAD_REQUEST_MESSAGE = 'Solicitud invalida.'

type HttpLikeError = {
  expose?: unknown
  status?: unknown
  statusCode?: unknown
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error'
}

function getExplicitStatusCode(error: unknown) {
  const candidate = error as HttpLikeError
  const statusCode =
    typeof candidate.statusCode === 'number'
      ? candidate.statusCode
      : typeof candidate.status === 'number'
        ? candidate.status
        : undefined

  if (statusCode && statusCode >= 400 && statusCode < 600) {
    return statusCode
  }

  return undefined
}

function isKnownValidationError(message: string) {
  return (
    /^invalid period format/i.test(message) ||
    /^invalid duration format/i.test(message)
  )
}

function getStatusCode(error: unknown, message: string) {
  const explicitStatusCode = getExplicitStatusCode(error)

  if (explicitStatusCode) {
    return explicitStatusCode
  }

  if (isKnownValidationError(message)) {
    return 400
  }

  return 500
}

function containsInternalDetails(message: string) {
  return /prisma|database|postgres|tenant|querying the database|supabase|redis|jwt|secret|token/i.test(
    message,
  )
}

function shouldExposeMessage(error: unknown, statusCode: number, message: string) {
  const candidate = error as HttpLikeError

  if (statusCode >= 500 || containsInternalDetails(message)) {
    return false
  }

  if (candidate.expose === true || isKnownValidationError(message)) {
    return true
  }

  return env.NODE_ENV !== 'production'
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  const message = getErrorMessage(error)
  const statusCode = getStatusCode(error, message)
  const publicMessage = shouldExposeMessage(error, statusCode, message)
    ? message
    : statusCode >= 500
      ? INTERNAL_ERROR_MESSAGE
      : BAD_REQUEST_MESSAGE

  if (env.NODE_ENV !== 'test') {
    console.error(error)
  }

  response.status(statusCode).json({
    error: publicMessage,
    code: statusCode,
  })
}
