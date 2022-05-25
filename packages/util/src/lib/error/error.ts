import { BaseError } from 'make-error';
import { Maybe } from '../value/maybe';

/**
 * A unique identifier for a specific error.
 */
export type StringErrorCode = string;

/**
 * An error that is identified by a unique code.
 */
export interface CodedError {
  code: StringErrorCode;

  /**
   * The original error, if available.
   */
   _error?: unknown;
}

/**
 * An error with a human-readable message.
 */
export interface ReadableError extends Partial<CodedError> {
  message?: Maybe<string>;
}

export function readableError(code: StringErrorCode, message?: string) {
  return {
    code,
    message
  };
}

export interface ReadableDataError<T = unknown> extends ReadableError {
  data?: T;
}

export interface ErrorWrapper {
  data: ReadableError | CodedError;
}

export type ErrorInput = ErrorWrapper | CodedError | ReadableError | ReadableDataError;

/**
 * Converts the input error content to a ReadableError or CodedError.
 * 
 * @param inputError 
 * @returns 
 */
export function toReadableError(inputError: Maybe<ErrorInput>): Maybe<CodedError | ReadableError> {
  let error: Maybe<CodedError | ReadableError>;

  if (inputError) {
    if ((inputError as CodedError).code) {
      error = inputError as ReadableError;
    } else if ((inputError as ErrorWrapper).data) {
      error = (inputError as ErrorWrapper).data as ReadableError;
    } else if (inputError instanceof BaseError) {
      error = {
        code: inputError.name,
        message: inputError.message,
        _error: inputError
      };
    } else {
      error = {
        code: 'ERROR',
        message: (inputError as ReadableError).message || '',
        _error: inputError
      };
    }
  }

  return error;
}
