import { openai } from "@ai-sdk/openai";
import { transcribe } from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_SIZE = 20 * 1024 * 1024;

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
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!(audioFile instanceof File)) {
      return Response.json(
        {
          error: "No audio file was provided.",
        },
        { status: 400 },
      );
    }

    if (audioFile.size === 0) {
      return Response.json(
        {
          error: "The selected audio file is empty.",
        },
        { status: 400 },
      );
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return Response.json(
        {
          error: "The audio file must be smaller than 20 MB.",
        },
        { status: 400 },
      );
    }

    const fileExtension = getFileExtension(audioFile.name);

    if (!SUPPORTED_EXTENSIONS.has(fileExtension)) {
      return Response.json(
        {
          error:
            "Unsupported audio format. Use MP3, MP4, MPEG, MPGA, M4A, WAV, or WebM.",
        },
        { status: 400 },
      );
    }

    const audioBuffer = new Uint8Array(
      await audioFile.arrayBuffer(),
    );

    const transcription = await transcribe({
      model: openai.transcription("gpt-4o-mini-transcribe"),
      audio: audioBuffer,
      abortSignal: AbortSignal.timeout(55_000),
    });

    const transcriptText = transcription.text.trim();

    if (!transcriptText) {
      return Response.json(
        {
          error:
            "No speech could be detected in the selected recording.",
        },
        { status: 422 },
      );
    }

    return Response.json({
      text: transcriptText,
      language: transcription.language ?? null,
      durationInSeconds:
        transcription.durationInSeconds ?? null,
    });
  } catch (error) {
    console.error("Audio transcription failed:", error);

    return Response.json(
      {
        error:
          "The audio could not be transcribed. Check your API balance, audio format, and terminal output.",
      },
      { status: 500 },
    );
  }
}