
const CODE_00000_UNKNOW_ERROR = "00000";
const CODE_00300_DATABASE_CONNECT_FAILURE = "00300";
const CODE_00301_DATABASE_EXECUTION_FAILURE = "00301";
const CODE_00321_DATABASE_DUPLICATE = "00321";
const CODE_00322_DATABASE_DATA_NOT_FOUND = "00322";
const CODE_00500_CONFIG_NOT_FOUND = "00500";
const CODE_10000_API_ERROR = "10000";
const CODE_10001_API_MISSING_PARAMETER = "10001";
const CODE_10002_API_PARAMETER_INCORRECT_TYPE = "10002";


export interface ErrorInfo {
  code: string;
  message: string;
}

export enum ErrorKey {
  DB_CONNECT_FAILURE_00300 = "DB_CONNECT_FAILURE_00300",
  DB_EXECUTION_FAILURE_00301 = "DB_EXECUTION_FAILURE_00301",
  DB_DUPLICATE_00321 = "DB_DUPLICATE_00321",
  DB_DATA_NOT_FOUND_00322 = "DB_DATA_NOT_FOUND_00322",
  CONFIG_NOT_FOUND_00500 = "CONFIG_NOT_FOUND_00500",
  API_UNKNOW_ERROR_10000 = "API_UNKNOW_ERROR_10000",
  API_MISSING_PARAMETER_10001 = "API_MISSING_PARAMETER_10001",
  API_PARAMETER_INCORRECT_TYPE_10002 = "API_PARAMETER_INCORRECT_TYPE_10002",

  UNKNOW_ERROR_00000 = "UNKNOW_ERROR_00000"
}

export const ErrorMap = {
  UNKNOW_ERROR_00000: {
    code: CODE_00000_UNKNOW_ERROR,
    message: "Unknow Error"
  },
  API_UNKNOW_ERROR_10000: {
    code: CODE_10000_API_ERROR,
    message: "API Error"
  },
  DB_CONNECT_FAILURE_00300: {
    code: CODE_00300_DATABASE_CONNECT_FAILURE,
    message: "Database Connection Failure"
  },
  DB_EXECUTION_FAILURE_00301: {
    code: CODE_00301_DATABASE_EXECUTION_FAILURE,
    message: "Database Executeion Failure"
  },
  DB_DUPLICATE_00321: {
    code: CODE_00321_DATABASE_DUPLICATE,
    message: "Database Duplicate"
  },
  DB_DATA_NOT_FOUND_00322: {
    code: CODE_00322_DATABASE_DATA_NOT_FOUND,
    message: "Database Data Not Found"
  },
  CONFIG_NOT_FOUND_00500: {
    code: CODE_00500_CONFIG_NOT_FOUND,
    message: "Config Not Found",
  },
  API_MISSING_PARAMETER_10001: {
    code: CODE_10001_API_MISSING_PARAMETER,
    message: "API Missing Parameter"
  },
  API_PARAMETER_INCORRECT_TYPE_10002: {
    code: CODE_10002_API_PARAMETER_INCORRECT_TYPE,
    message: "API Parameter Incorrect Type"
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