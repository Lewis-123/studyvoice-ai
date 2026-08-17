import { APICallError, LoadAPIKeyError, NoObjectGeneratedError,
NoTranscriptGeneratedError, RetryError, } from “ai”;

export type PublicApiErrorCode = | “CONFIGURATION_ERROR” |
“INVALID_API_KEY” | “API_PERMISSION_DENIED” | “API_CREDIT_EXHAUSTED” |
“RATE_LIMITED” | “NETWORK_ERROR” | “PROVIDER_UNAVAILABLE” |
“REQUEST_TIMEOUT” | “REQUEST_CANCELLED” | “INVALID_AI_RESPONSE” |
“TRANSCRIPTION_FAILED” | “INVALID_REQUEST” | “UNSUPPORTED_AUDIO” |
“FILE_TOO_LARGE” | “UNKNOWN_ERROR”;

type PublicApiError = { code: PublicApiErrorCode; message: string;
retryable: boolean; };

type MappedApiError = PublicApiError & { status: number; };

type AiOperation = | “study generation” | “transcription”;

export type RequestAbortContext = { signal: AbortSignal; didTimeout: ()
=> boolean; wasClientAborted: () => boolean; cleanup: () => void; };

export function createPublicErrorResponse( code: PublicApiErrorCode,
message: string, status: number, retryable = false, ) { const
publicError: PublicApiError = { code, message, retryable, };

return Response.json( { error: publicError, }, { status, headers: {
“Cache-Control”: “no-store”, }, }, ); }

export function createMissingApiKeyResponse() { return
createPublicErrorResponse( “CONFIGURATION_ERROR”, “The AI service is not
configured. Add GROQ_API_KEY to the server environment and restart the
application.”, 503, false, ); }

export function createRequestAbortContext( parentSignal: AbortSignal,
timeoutMilliseconds: number, ): RequestAbortContext { const controller =
new AbortController();

let timedOut = false;

function abortFromClient() { if (!controller.signal.aborted) {
controller.abort(); } }

if (parentSignal.aborted) { abortFromClient(); } else {
parentSignal.addEventListener( “abort”, abortFromClient, { once: true,
}, ); }

const timeoutId = setTimeout(() => { timedOut = true;

    if (!controller.signal.aborted) {
      controller.abort();
    }

}, timeoutMilliseconds);

return { signal: controller.signal,

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

}; }

function unwrapRetryError(error: unknown) { let currentError = error;

for ( let attempt = 0; attempt < 4; attempt += 1 ) { if
(!RetryError.isInstance(currentError)) { break; }

    const retryErrors = currentError.errors;

    if (retryErrors.length === 0) {
      break;
    }

    currentError =
      retryErrors[retryErrors.length - 1];

}

return currentError; }

function getErrorSearchText(error: unknown) { const searchParts:
string[] = [];

if (error instanceof Error) { searchParts.push(error.message); }

if (APICallError.isInstance(error)) { if ( typeof error.responseBody ===
“string” ) { searchParts.push(error.responseBody); } else if (
error.responseBody !== undefined ) { try { searchParts.push(
JSON.stringify(error.responseBody), ); } catch { // Ignore provider
response bodies // that cannot be serialized. } } }

return searchParts .join(” “) .toLowerCase(); }

function isQuotaOrBillingError( error: unknown, ) { const errorText =
getErrorSearchText(error);

return ( errorText.includes( “insufficient_quota”, ) ||
errorText.includes( “exceeded your current quota”, ) ||
errorText.includes( “billing_hard_limit”, ) || errorText.includes(
“billing limit”, ) || errorText.includes( “credit balance”, ) ||
errorText.includes( “spending limit”, ) || errorText.includes( “payment
required”, ) ); }

function isJsonValidationError( error: unknown, ) { const errorText =
getErrorSearchText(error);

return ( errorText.includes( “json_validate_failed”, ) ||
errorText.includes( “failed to generate json”, ) || errorText.includes(
“generated json does not match”, ) || errorText.includes(
“failed_generation”, ) || errorText.includes( “schema validation”, ) );
}

function isUnsupportedAudioError( error: unknown, ) { const errorText =
getErrorSearchText(error);

return ( errorText.includes( “unsupported audio”, ) ||
errorText.includes( “unsupported file”, ) || errorText.includes(
“invalid file format”, ) || errorText.includes( “audio format”, ) ||
errorText.includes( “could not decode”, ) ); }

function isAbortLikeError( error: unknown, ) { if (!(error instanceof
Error)) { return false; }

const message = error.message.toLowerCase();

return ( error.name === “AbortError” || message.includes(“aborted”) ||
message.includes(“aborterror”) ); }

function mapAiError( originalError: unknown, operation: AiOperation, ):
MappedApiError { const error = unwrapRetryError(originalError);

if (LoadAPIKeyError.isInstance(error)) { return { code:
“CONFIGURATION_ERROR”, message: “The Groq AI service does not have a
configured API key.”, status: 503, retryable: false, }; }

if ( NoObjectGeneratedError.isInstance(error) ) { return { code:
“INVALID_AI_RESPONSE”, message: “The AI could not produce a complete
structured study pack. Try again with fewer selected outputs.”, status:
502, retryable: true, }; }

if ( NoTranscriptGeneratedError.isInstance( error, ) ) { return { code:
“TRANSCRIPTION_FAILED”, message: “The recording could not be converted
into a usable transcript.”, status: 422, retryable: true, }; }

if (APICallError.isInstance(error)) { const statusCode =
error.statusCode;

    if (statusCode === 401) {
      return {
        code: "INVALID_API_KEY",
        message:
          "The configured Groq API key is invalid, expired, or has been revoked.",
        status: 503,
        retryable: false,
      };
    }

    if (statusCode === 402) {
      return {
        code: "API_CREDIT_EXHAUSTED",
        message:
          "The Groq account has no available quota or requires an account update.",
        status: 402,
        retryable: false,
      };
    }

    if (statusCode === 403) {
      return {
        code: "API_PERMISSION_DENIED",
        message:
          "The Groq API key does not have permission to use the requested model.",
        status: 503,
        retryable: false,
      };
    }

    if (
      operation === "transcription" &&
      statusCode === 413
    ) {
      return {
        code: "FILE_TOO_LARGE",
        message:
          "The audio file is larger than the provider's accepted upload limit.",
        status: 413,
        retryable: false,
      };
    }

    if (
      statusCode === 400 &&
      isJsonValidationError(error)
    ) {
      return {
        code: "INVALID_AI_RESPONSE",
        message:
          "Groq could not produce JSON matching the study-pack structure. Try again or select fewer study outputs.",
        status: 502,
        retryable: true,
      };
    }

    if (
      statusCode === 429 &&
      isQuotaOrBillingError(error)
    ) {
      return {
        code: "API_CREDIT_EXHAUSTED",
        message:
          "The Groq account has no available quota or has reached its account spending limit.",
        status: 402,
        retryable: false,
      };
    }

    if (statusCode === 429) {
      return {
        code: "RATE_LIMITED",
        message:
          "The Groq free-tier rate limit has been reached. Wait briefly and try again.",
        status: 429,
        retryable: true,
      };
    }

    if (
      operation === "transcription" &&
      statusCode === 400 &&
      isUnsupportedAudioError(error)
    ) {
      return {
        code: "UNSUPPORTED_AUDIO",
        message:
          "Groq could not process the selected audio format.",
        status: 415,
        retryable: false,
      };
    }

    if (
      operation === "transcription" &&
      statusCode === 422
    ) {
      return {
        code: "TRANSCRIPTION_FAILED",
        message:
          "Groq could not produce a usable transcript from the recording.",
        status: 422,
        retryable: true,
      };
    }

    if (
      statusCode === 408 ||
      statusCode === 504
    ) {
      return {
        code: "REQUEST_TIMEOUT",
        message:
          "The Groq AI service took too long to respond.",
        status: 504,
        retryable: true,
      };
    }

    if (
      statusCode !== undefined &&
      statusCode >= 500
    ) {
      return {
        code: "PROVIDER_UNAVAILABLE",
        message:
          "The Groq AI service is temporarily unavailable.",
        status: 503,
        retryable: true,
      };
    }

    if (!statusCode) {
      return {
        code: "NETWORK_ERROR",
        message:
          "The server could not connect to the Groq AI service.",
        status: 503,
        retryable: true,
      };
    }

    return {
      code: "UNKNOWN_ERROR",
      message: `The ${operation} request was rejected by the Groq AI service.`,
      status: 502,
      retryable:
        error.isRetryable === true,
    };

}

if (isAbortLikeError(error)) { return { code: “REQUEST_TIMEOUT”,
message: “The AI request was stopped because it took too long.”, status:
504, retryable: true, }; }

return { code: “UNKNOWN_ERROR”, message:
The ${operation} request failed unexpectedly., status: 500, retryable:
true, }; }

export function createAiErrorResponse( error: unknown, operation:
AiOperation, ) { console.error( AI ${operation} failed:, error, );

const mappedError = mapAiError( error, operation, );

return createPublicErrorResponse( mappedError.code, mappedError.message,
mappedError.status, mappedError.retryable, ); }
