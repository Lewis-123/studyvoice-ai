"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type VoiceRecorderProps = {
  audioFile: File | null;
  disabled?: boolean;
  maxAudioSize: number;
  onAudioReady: (file: File) => void;
  onRemove: () => void;
  onError: (message: string) => void;
  onRecordingChange: (isRecording: boolean) => void;
};

const MAX_RECORDING_SECONDS = 5 * 60;

function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  const supportedTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  return supportedTypes.find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  return "webm";
}

export default function VoiceRecorder({
  audioFile,
  disabled = false,
  maxAudioSize,
  onAudioReady,
  onRemove,
  onError,
  onRecordingChange,
}: VoiceRecorderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!audioFile) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(audioFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [audioFile]);

  useEffect(() => {
    return () => {
      stopTimer();

      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.stop();
      }

      stopMediaStream();
    };
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopMediaStream() {
    mediaStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    mediaStreamRef.current = null;
  }

  function updateRecordingState(recording: boolean) {
    setIsRecording(recording);
    onRecordingChange(recording);
  }

  function finishRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.stop();
  }

  async function startRecording() {
    onError("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onError(
        "This browser does not support microphone recording. Upload an audio file instead.",
      );
      return;
    }

    try {
      stopTimer();
      stopMediaStream();
      onRemove();

      const mediaStream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

      mediaStreamRef.current = mediaStream;
      audioChunksRef.current = [];

      const supportedMimeType = getSupportedMimeType();

      const recorder = supportedMimeType
        ? new MediaRecorder(mediaStream, {
            mimeType: supportedMimeType,
          })
        : new MediaRecorder(mediaStream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopTimer();
        stopMediaStream();
        updateRecordingState(false);

        onError(
          "A recording error occurred. Check your microphone and try again.",
        );
      };

      recorder.onstop = () => {
        stopTimer();
        stopMediaStream();
        updateRecordingState(false);

        const finalMimeType =
          recorder.mimeType ||
          supportedMimeType ||
          "audio/webm";

        const recordingBlob = new Blob(
          audioChunksRef.current,
          {
            type: finalMimeType,
          },
        );

        audioChunksRef.current = [];

        if (recordingBlob.size === 0) {
          onError(
            "The recording was empty. Check your microphone and try again.",
          );
          return;
        }

        if (recordingBlob.size > maxAudioSize) {
          onError(
            "The recording is larger than the 20 MB limit. Record a shorter voice note.",
          );
          return;
        }

        const extension = getFileExtension(finalMimeType);

        const recordingFile = new File(
          [recordingBlob],
          `studyvoice-recording-${Date.now()}.${extension}`,
          {
            type: finalMimeType,
          },
        );

        onAudioReady(recordingFile);
      };

      recorder.start(1000);

      setRecordingSeconds(0);
      updateRecordingState(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((currentSeconds) => {
          const nextSeconds = currentSeconds + 1;

          if (nextSeconds >= MAX_RECORDING_SECONDS) {
            finishRecording();
          }

          return nextSeconds;
        });
      }, 1000);
    } catch (error) {
      stopTimer();
      stopMediaStream();
      updateRecordingState(false);

      if (error instanceof DOMException) {
        if (
          error.name === "NotAllowedError" ||
          error.name === "SecurityError"
        ) {
          onError(
            "Microphone permission was denied. Allow microphone access in your browser or upload an audio file.",
          );
          return;
        }

        if (error.name === "NotFoundError") {
          onError(
            "No microphone was detected on this device.",
          );
          return;
        }

        if (error.name === "NotReadableError") {
          onError(
            "The microphone is already being used by another application.",
          );
          return;
        }
      }

      onError(
        "The microphone could not be started. Check your browser permissions and try again.",
      );
    }
  }

  function cancelRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;

      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }

    audioChunksRef.current = [];
    stopTimer();
    stopMediaStream();
    setRecordingSeconds(0);
    updateRecordingState(false);
  }

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    onError("");

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("audio/")) {
      event.target.value = "";

      onError(
        "Please select a valid MP3, MP4, M4A, WAV, MPEG, MPGA, or WebM audio file.",
      );
      return;
    }

    if (selectedFile.size > maxAudioSize) {
      event.target.value = "";

      onError(
        "The selected audio file is larger than the 20 MB limit.",
      );
      return;
    }

    onAudioReady(selectedFile);
  }

  function removeSelectedAudio() {
    onRemove();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                isRecording
                  ? "bg-red-100"
                  : "bg-white"
              }`}
            >
              {isRecording ? "🔴" : "🎙️"}
            </span>

            <div>
              <h3 className="font-bold text-slate-950">
                Record with your microphone
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Record a lecture summary, personal explanation,
                or revision note directly in the browser.
              </p>
            </div>
          </div>

          {!isRecording ? (
            <button
              type="button"
              disabled={disabled}
              onClick={startRecording}
              className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Start recording
            </button>
          ) : (
            <button
              type="button"
              onClick={finishRecording}
              className="shrink-0 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Stop recording
            </button>
          )}
        </div>

        {isRecording && (
          <div
            role="status"
            className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-red-200 bg-white p-4 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
              </span>

              <div>
                <p className="text-sm font-bold text-red-700">
                  Recording in progress
                </p>

                <p className="mt-1 font-mono text-lg font-black text-slate-950">
                  {formatRecordingTime(recordingSeconds)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={cancelRecording}
              className="text-sm font-bold text-slate-600 hover:text-red-700"
            >
              Cancel recording
            </button>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Maximum recording time: 5 minutes. Your browser will
          request permission before accessing the microphone.
        </p>
      </section>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Or upload audio
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <label
        htmlFor="audio-file"
        className={`block rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          disabled || isRecording
            ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-70"
            : "cursor-pointer border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50"
        }`}
      >
        <span className="block text-3xl">🎧</span>

        <span className="mt-3 block font-bold text-slate-900">
          Select an existing audio file
        </span>

        <span className="mt-2 block text-sm text-slate-500">
          MP3, MP4, M4A, WAV, MPEG, MPGA, or WebM
        </span>

        <span className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Browse audio files
        </span>
      </label>

      <input
        ref={fileInputRef}
        id="audio-file"
        type="file"
        accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,audio/*"
        disabled={disabled || isRecording}
        onChange={handleFileSelection}
        className="sr-only"
      />

      {audioFile && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-emerald-950">
                {audioFile.name}
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                {(audioFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <button
              type="button"
              disabled={disabled || isRecording}
              onClick={removeSelectedAudio}
              className="shrink-0 text-sm font-bold text-emerald-800 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
          </div>

          {previewUrl && (
            <audio
              controls
              preload="metadata"
              src={previewUrl}
              className="mt-4 w-full"
            >
              Your browser does not support audio playback.
            </audio>
          )}
        </section>
      )}
    </div>
  );
}