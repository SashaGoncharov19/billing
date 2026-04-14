import { Elysia } from 'elysia'
import { logger } from '../lib/logger'
import { captureException } from '../lib/sentry'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('VALIDATION_ERROR', 'Validation failed', 422, details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403)
  }
}

export class InvalidTransitionError extends AppError {
  constructor(message: string) {
    super('INVALID_TRANSITION', message, 422)
  }
}

export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  { as: 'global' },
  (context) => {
    const { error, set } = context
    const requestId = 'requestId' in context ? String(context.requestId) : undefined

    if (error instanceof AppError) {
      set.status = error.statusCode
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      }
    }

    const err = error as Error & { name?: string; message?: string; stack?: string }

    if (err.name === 'ValidationError') {
      set.status = 422
      return {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.message,
        requestId,
      }
    }

    captureException(err, { requestId })
    logger.error({ requestId, error: err.message, stack: err.stack }, 'Unhandled API Error')

    set.status = 500
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    }
  },
)
