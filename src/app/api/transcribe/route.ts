import { openai } from "@ai-sdk/openai";
import { transcribe } from "ai";

import {
  createAiErrorResponse,
  createMissingApiKeyResponse,
  createPublicErrorResponse,
  createRequestAbortContext,
  type RequestAbortContext,
} from "@/lib/server-ai-error";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const SERVER_TIMEOUT_MILLISECONDS = 55_000;

const SUPPORTED_EXTENSIONS = new Set([
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "wav",
  "webm",
]);

function getFileExtension(filename: string) {
  return (
    filename
      .split(".")
      .pop()
      ?.trim()
      .toLowerCase() ?? ""
  );
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return createMissingApiKeyResponse();
  }

  let abortContext: RequestAbortContext | null =
    null;

  try {
    const formData =
      await request.formData();

    const audioFile =
      formData.get("audio");

    if (!(audioFile instanceof File)) {
      return createPublicErrorResponse(
        "INVALID_REQUEST",
        "No audio file was provided.",
        400,
        false,
      );
    }

    if (audioFile.size === 0) {
      return createPublicErrorResponse(
        "INVALID_REQUEST",
        "The selected audio file is empty.",
        400,
        false,
      );
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return createPublicErrorResponse(
        "FILE_TOO_LARGE",
        "The audio file must be smaller than 20 MB.",
        413,
        false,
      );
    }

    const fileExtension =
      getFileExtension(audioFile.name);

    if (
      !SUPPORTED_EXTENSIONS.has(fileExtension)
    ) {
      return createPublicErrorResponse(
        "UNSUPPORTED_AUDIO",
        "Unsupported audio format. Use MP3, MP4, MPEG, MPGA, M4A, WAV, or WebM.",
        415,
        false,
      );
    }

    abortContext = createRequestAbortContext(
      request.signal,
      SERVER_TIMEOUT_MILLISECONDS,
    );

    const audioBuffer = new Uint8Array(
      await audioFile.arrayBuffer(),
    );

    const transcription = await transcribe({
      model: openai.transcription(
        "gpt-4o-mini-transcribe",
      ),

      audio: audioBuffer,
      maxRetries: 1,
      abortSignal: abortContext.signal,
    });

    const transcriptText =
      transcription.text.trim();

    if (!transcriptText) {
      return createPublicErrorResponse(
        "TRANSCRIPTION_FAILED",
        "No understandable speech was detected in the recording.",
        422,
        true,
      );
    }

    return Response.json(
      {
        text: transcriptText,
        language:
          transcription.language ?? null,
        durationInSeconds:
          transcription.durationInSeconds ??
          null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (abortContext?.didTimeout()) {
      return createPublicErrorResponse(
        "REQUEST_TIMEOUT",
        "Audio transcription exceeded the server time limit. Try a shorter recording.",
        504,
        true,
      );
    }

    if (abortContext?.wasClientAborted()) {
      return createPublicErrorResponse(
        "REQUEST_CANCELLED",
        "Audio transcription was cancelled.",
        499,
        true,
      );
    }

    return createAiErrorResponse(
      error,
      "transcription",
    );
  } finally {
    abortContext?.cleanup();
  }
}