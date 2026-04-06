
const CODE_00000_UNKNOW_ERROR = "00000";
const CODE_00400_API_ERROR = "00400";

export interface ErrorInfo {
  code: string;
  message: string;
}

export enum ErrorKey {
  UNKNOW_ERROR_00000 = "UNKNOW_ERROR_00000",
  API_UNKNOW_ERROR_00400 = "API_UNKNOW_ERROR_00400",
}

export const ErrorMap = {
  UNKNOW_ERROR_00000: {
    code: CODE_00000_UNKNOW_ERROR,
    message: "Unknow Error"
  },
  API_UNKNOW_ERROR_00400: {
    code: CODE_00400_API_ERROR,
    message: "API Error"
  }
} as const satisfies Record<ErrorKey, ErrorInfo>;

export type ErrorMapKey = keyof typeof ErrorMap;

export class AppError extends Error {
  code: string;
  message: string;
  details?: string;
  statusCode: number;

  constructor(
    errorKey: ErrorKey | ErrorMapKey,
    details?: string,
    statusCode: number = 400
  ) {
    // Convert ErrorKey enum to ErrorMapKey string
    const key = typeof errorKey === 'string' ? errorKey : errorKey as unknown as ErrorMapKey;
    const errorConfig = ErrorMap[key];

    super(errorConfig.message);

    this.name = "AppError";
    this.code = errorConfig.code;
    this.message = errorConfig.message;
    this.details = details;
    this.statusCode = statusCode;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Get error response object (useful for API responses)
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }

  /**
   * Get full error info
   */
  getFullError() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Type guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function createAppError(key: ErrorKey = ErrorKey.UNKNOW_ERROR_00000, message: string | null = null): AppError {
  return new AppError(key, message ?? undefined);
}

export function updateAppError(error: AppError, tag: string): AppError {
  error.message = `${tag} > ${error.message}`;
  return error;
}

export function getErrorMessage(error: unknown, key: ErrorKey = ErrorKey.UNKNOW_ERROR_00000, tag: string = ''): AppError {
  if (error instanceof AppError) {
    return updateAppError(error, tag);
  } else if (error instanceof Error) {
    return createAppError(key, `${tag}: ${error.message}`);
  } else {
    return createAppError(key, `Unknown error occurred in ${tag}`);
  }
}