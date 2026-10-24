import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetailDto } from './api.types';

/** Normalized API failure: keeps the HTTP status and the backend `code`/`detail`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ProblemDetailDto | string | null;
    const problem = body && typeof body === 'object' ? body : null;
    return new ApiError(
      error.status,
      problem?.code ?? null,
      problem?.detail ?? error.message ?? 'No se pudo completar la solicitud.',
    );
  }
  return new ApiError(0, null, 'No se pudo conectar con el servidor.');
}
