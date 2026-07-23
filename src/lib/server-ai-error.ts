import {
  APICallError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  NoTranscriptGeneratedError,
  RetryError,
} from "ai";

export type PublicApiErrorCode =
  | "CONFIGURATION_ERROR"
  | "INVALID_API_KEY"
  | "API_PERMISSION_DENIED"
  | "API_CREDIT_EXHAUSTED"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "REQUEST_TIMEOUT"
  | "REQUEST_CANCELLED"
  | "INVALID_AI_RESPONSE"
  | "TRANSCRIPTION_FAILED"
  | "INVALID_REQUEST"
  | "UNSUPPORTED_AUDIO"
  | "FILE_TOO_LARGE"
  | "UNKNOWN_ERROR";

type PublicApiError = {
  code: PublicApiErrorCode;
  message: string;
  retryable: boolean;
};

type MappedApiError = PublicApiError & {
  status: number;
};

type AiOperation = "study generation" | "transcription";

export type RequestAbortContext = {
  signal: AbortSignal;
  didTimeout: () => boolean;
  wasClientAborted: () => boolean;
  cleanup: () => void;
};

export function createPublicErrorResponse(
  code: PublicApiErrorCode,
  message: string,
  status: number,
  retryable = false,
) {
  const publicError: PublicApiError = {
    code,
    message,
    retryable,
  };

  return Response.json(
    {
      error: publicError,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function createMissingApiKeyResponse() {
  return createPublicErrorResponse(
    "CONFIGURATION_ERROR",
    "The AI service is not configured. Add OPENAI_API_KEY to the server environment and restart the application.",
    503,
    false,
  );
}

export function createRequestAbortContext(
  parentSignal: AbortSignal,
  timeoutMilliseconds: number,
): RequestAbortContext {
  const controller = new AbortController();

  let timedOut = false;

  function abortFromClient() {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }

  if (parentSignal.aborted) {
    abortFromClient();
  } else {
    parentSignal.addEventListener(
      "abort",
      abortFromClient,
      {
        once: true,
      },
    );
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;

    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutMilliseconds);

  return {
    signal: controller.signal,

    didTimeout() {
      return timedOut;
    },

    wasClientAborted() {
      return parentSignal.aborted && !timedOut;
    },

    cleanup() {
      clearTimeout(timeoutId);

      parentSignal.removeEventListener(
        "abort",
        abortFromClient,
      );
    },
  };
}

function getNestedRetryError(error: unknown) {
  if (!RetryError.isInstance(error)) {
    return error;
  }

  const retryErrors = error.errors;

  if (retryErrors.length === 0) {
    return error;
  }

  return retryErrors[retryErrors.length - 1];
}

function getErrorSearchText(error: unknown) {
  const searchParts: string[] = [];

  if (error instanceof Error) {
    searchParts.push(error.message);
  }

  if (APICallError.isInstance(error)) {
    if (typeof error.responseBody === "string") {
      searchParts.push(error.responseBody);
    } else if (error.responseBody !== undefined) {
      try {
        searchParts.push(
          JSON.stringify(error.responseBody),
        );
      } catch {
        // Ignore response bodies that cannot be serialized.
      }
    }
  }

  return searchParts.join(" ").toLowerCase();
}

function isQuotaError(error: unknown) {
  const errorText = getErrorSearchText(error);

  return (
    errorText.includes("insufficient_quota") ||
    errorText.includes("exceeded your current quota") ||
    errorText.includes("billing_hard_limit") ||
    errorText.includes("billing limit") ||
    errorText.includes("credit balance") ||
    errorText.includes("payment method") ||
    errorText.includes("billing")
  );
}

function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    error.name === "AbortError" ||
    message.includes("aborted") ||
    message.includes("aborterror")
  );
}

function mapAiError(
  originalError: unknown,
  operation: AiOperation,
): MappedApiError {
  const nestedError = getNestedRetryError(originalError);

  if (nestedError !== originalError) {
    return mapAiError(nestedError, operation);
  }

  const error = nestedError;

  if (LoadAPIKeyError.isInstance(error)) {
    return {
      code: "CONFIGURATION_ERROR",
      message:
        "The AI service does not have a configured API key.",
      status: 503,
      retryable: false,
    };
  }

  if (NoObjectGeneratedError.isInstance(error)) {
    return {
      code: "INVALID_AI_RESPONSE",
      message:
        "The AI returned an incomplete or incorrectly formatted study pack.",
      status: 502,
      retryable: true,
    };
  }

  if (NoTranscriptGeneratedError.isInstance(error)) {
    return {
      code: "TRANSCRIPTION_FAILED",
      message:
        "The recording could not be converted into a usable transcript.",
      status: 422,
      retryable: true,
    };
  }

  if (APICallError.isInstance(error)) {
    const statusCode = error.statusCode;

    if (statusCode === 401) {
      return {
        code: "INVALID_API_KEY",
        message:
          "The configured OpenAI API key is invalid, expired, or has been revoked.",
        status: 503,
        retryable: false,
      };
    }

    if (statusCode === 403) {
      return {
        code: "API_PERMISSION_DENIED",
        message:
          "The API key does not have permission to use the requested AI model.",
        status: 503,
        retryable: false,
      };
    }

    if (statusCode === 429 && isQuotaError(error)) {
      return {
        code: "API_CREDIT_EXHAUSTED",
        message:
          "The OpenAI API account has no available credit or has reached its spending limit.",
        status: 402,
        retryable: false,
      };
    }

    if (statusCode === 429) {
      return {
        code: "RATE_LIMITED",
        message:
          "The AI service is receiving too many requests. Wait briefly and try again.",
        status: 429,
        retryable: true,
      };
    }

    if (statusCode === 408 || statusCode === 504) {
      return {
        code: "REQUEST_TIMEOUT",
        message:
          "The AI provider took too long to respond.",
        status: 504,
        retryable: true,
      };
    }

    if (statusCode && statusCode >= 500) {
      return {
        code: "PROVIDER_UNAVAILABLE",
        message:
          "The AI provider is temporarily unavailable.",
        status: 503,
        retryable: true,
      };
    }

    if (!statusCode) {
      return {
        code: "NETWORK_ERROR",
        message:
          "The server could not connect to the AI provider.",
        status: 503,
        retryable: true,
      };
    }

    return {
      code: "UNKNOWN_ERROR",
      message: `The ${operation} request was rejected by the AI provider.`,
      status: 502,
      retryable: error.isRetryable,
    };
  }

  if (isAbortLikeError(error)) {
    return {
      code: "REQUEST_TIMEOUT",
      message:
        "The AI request was stopped because it took too long.",
      status: 504,
      retryable: true,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: `The ${operation} request failed unexpectedly.`,
    status: 500,
    retryable: true,
  };
}

export function createAiErrorResponse(
  error: unknown,
  operation: AiOperation,
) {
  console.error(`AI ${operation} failed:`, error);

  const mappedError = mapAiError(
    error,
    operation,
  );

  return createPublicErrorResponse(
    mappedError.code,
    mappedError.message,
    mappedError.status,
    mappedError.retryable,
  );
}