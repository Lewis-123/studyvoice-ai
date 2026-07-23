"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import StudyExportActions from "@/components/study-export-actions";
import StudyHistory from "@/components/study-history";
import StudyResults from "@/components/study-results";
import VoiceRecorder from "@/components/voice-recorder";
import {
  studyPackSchema,
  type OutputId,
  type StudyPack,
} from "@/lib/study-schema";
import {
  MAX_SAVED_STUDY_SESSIONS,
  clearSavedStudySessions,
  createStudySessionId,
  loadSavedStudySessions,
  saveStudySessions,
  type SavedStudySession,
  type StudySessionEducationLevel,
  type StudySessionInputMode,
  type StudySessionQuizDifficulty,
  type StudyTranscript,
} from "@/lib/study-session";

type InputMode =
  StudySessionInputMode;

type EducationLevel =
  StudySessionEducationLevel;

type QuizDifficulty =
  StudySessionQuizDifficulty;

type GenerationPhase =
  | "idle"
  | "transcribing"
  | "generating";

type StudyOutput = {
  id: OutputId;
  title: string;
  description: string;
  icon: string;
};

const MAX_AUDIO_SIZE =
  20 * 1024 * 1024;

const CLIENT_REQUEST_TIMEOUT =
  70_000;

const LONG_REQUEST_SECONDS = 20;

const SUPPORTED_AUDIO_EXTENSIONS =
  new Set([
    "mp3",
    "mp4",
    "mpeg",
    "mpga",
    "m4a",
    "wav",
    "webm",
  ]);

const inputModes: Array<{
  id: InputMode;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    id: "topic",
    title: "Enter topic",
    description:
      "Generate a study pack from a subject or question.",
    icon: "⌨️",
  },
  {
    id: "notes",
    title: "Paste notes",
    description:
      "Transform written notes into revision materials.",
    icon: "📝",
  },
  {
    id: "voice",
    title: "Voice note",
    description:
      "Record or upload audio for transcription.",
    icon: "🎙️",
  },
];

const studyOutputs: StudyOutput[] = [
  {
    id: "explanation",
    title: "Explanation",
    description:
      "A clear, detailed explanation of the material.",
    icon: "💡",
  },
  {
    id: "summary",
    title: "Summary",
    description:
      "A concise overview of the main information.",
    icon: "📄",
  },
  {
    id: "keyPoints",
    title: "Key points",
    description:
      "The most important concepts and definitions.",
    icon: "📌",
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description:
      "Interactive question-and-answer revision cards.",
    icon: "🗂️",
  },
  {
    id: "quiz",
    title: "Quiz",
    description:
      "Multiple-choice questions with explanations.",
    icon: "✅",
  },
  {
    id: "revisionQuestions",
    title: "Revision questions",
    description:
      "Open-ended questions for deeper practice.",
    icon: "🧠",
  },
  {
    id: "actionPoints",
    title: "Action points",
    description:
      "Practical tasks with priorities and reasons.",
    icon: "🎯",
  },
];

const defaultOutputs: OutputId[] = [
  "explanation",
  "summary",
  "flashcards",
  "quiz",
  "actionPoints",
];

class StudyRequestError extends Error {
  code: string;
  retryable: boolean;

  constructor(
    code: string,
    message: string,
    retryable: boolean,
  ) {
    super(message);

    this.name = "StudyRequestError";
    this.code = code;
    this.retryable = retryable;
  }
}

function getFileExtension(
  filename: string,
) {
  return (
    filename
      .split(".")
      .pop()
      ?.trim()
      .toLowerCase() ?? ""
  );
}

function isSupportedAudioFile(
  file: File,
) {
  return SUPPORTED_AUDIO_EXTENSIONS.has(
    getFileExtension(file.name),
  );
}

function parseApiError(
  responseData: unknown,
  status: number,
) {
  if (
    typeof responseData === "object" &&
    responseData !== null &&
    "error" in responseData
  ) {
    const errorValue =
      responseData.error;

    if (
      typeof errorValue === "object" &&
      errorValue !== null &&
      "message" in errorValue &&
      typeof errorValue.message ===
        "string"
    ) {
      return new StudyRequestError(
        "code" in errorValue &&
          typeof errorValue.code ===
            "string"
          ? errorValue.code
          : "UNKNOWN_ERROR",

        errorValue.message,

        "retryable" in errorValue &&
          typeof errorValue.retryable ===
            "boolean"
          ? errorValue.retryable
          : status >= 500,
      );
    }

    if (
      typeof errorValue === "string"
    ) {
      return new StudyRequestError(
        "UNKNOWN_ERROR",
        errorValue,
        status >= 500,
      );
    }
  }

  if (status === 402) {
    return new StudyRequestError(
      "API_CREDIT_EXHAUSTED",
      "The API account has no available credit.",
      false,
    );
  }

  if (status === 413) {
    return new StudyRequestError(
      "FILE_TOO_LARGE",
      "The uploaded file is too large.",
      false,
    );
  }

  if (status === 415) {
    return new StudyRequestError(
      "UNSUPPORTED_AUDIO",
      "The selected audio format is not supported.",
      false,
    );
  }

  if (status === 429) {
    return new StudyRequestError(
      "RATE_LIMITED",
      "The service is temporarily receiving too many requests.",
      true,
    );
  }

  if (status === 504) {
    return new StudyRequestError(
      "REQUEST_TIMEOUT",
      "The request took too long to complete.",
      true,
    );
  }

  return new StudyRequestError(
    "UNKNOWN_ERROR",
    "The request could not be completed.",
    status >= 500,
  );
}

async function requestJson<T>({
  url,
  options,
  externalSignal,
  timeoutMilliseconds,
}: {
  url: string;
  options: RequestInit;
  externalSignal: AbortSignal;
  timeoutMilliseconds: number;
}): Promise<T> {
  const controller =
    new AbortController();

  let didTimeout = false;

  function abortFromExternalSignal() {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }

  if (externalSignal.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal.addEventListener(
      "abort",
      abortFromExternalSignal,
      {
        once: true,
      },
    );
  }

  const timeoutId =
    window.setTimeout(() => {
      didTimeout = true;

      if (
        !controller.signal.aborted
      ) {
        controller.abort();
      }
    }, timeoutMilliseconds);

  try {
    const response = await fetch(
      url,
      {
        ...options,
        signal: controller.signal,
      },
    );

    const rawResponse =
      await response.text();

    let responseData: unknown = null;

    if (rawResponse) {
      try {
        responseData =
          JSON.parse(rawResponse);
      } catch {
        responseData = rawResponse;
      }
    }

    if (!response.ok) {
      throw parseApiError(
        responseData,
        response.status,
      );
    }

    return responseData as T;
  } catch (error) {
    if (
      error instanceof
      StudyRequestError
    ) {
      throw error;
    }

    if (didTimeout) {
      throw new StudyRequestError(
        "REQUEST_TIMEOUT",
        "The current request stage exceeded 70 seconds.",
        true,
      );
    }

    if (externalSignal.aborted) {
      throw new StudyRequestError(
        "REQUEST_CANCELLED",
        "The request was cancelled.",
        true,
      );
    }

    if (
      error instanceof TypeError ||
      (error instanceof Error &&
        error.message
          .toLowerCase()
          .includes("fetch"))
    ) {
      throw new StudyRequestError(
        "NETWORK_ERROR",
        "StudyVoice AI could not reach the server. Check your connection and try again.",
        true,
      );
    }

    throw new StudyRequestError(
      "UNKNOWN_ERROR",
      "An unexpected request error occurred.",
      true,
    );
  } finally {
    window.clearTimeout(timeoutId);

    externalSignal.removeEventListener(
      "abort",
      abortFromExternalSignal,
    );
  }
}

function normalizeClientError(
  error: unknown,
) {
  if (
    error instanceof StudyRequestError
  ) {
    return error;
  }

  if (error instanceof Error) {
    return new StudyRequestError(
      "UNKNOWN_ERROR",
      error.message,
      true,
    );
  }

  return new StudyRequestError(
    "UNKNOWN_ERROR",
    "An unexpected error occurred.",
    true,
  );
}

function getRecoveryMessage(
  code: string,
) {
  switch (code) {
    case "CONFIGURATION_ERROR":
      return "Create .env.local, add OPENAI_API_KEY, and restart the development server.";

    case "INVALID_API_KEY":
      return "Create a new API key, update .env.local, and restart the application.";

    case "API_PERMISSION_DENIED":
      return "Check the API project's permissions and confirm that the selected models are available.";

    case "API_CREDIT_EXHAUSTED":
      return "Add API credit or increase the API project spending limit before testing again.";

    case "RATE_LIMITED":
      return "Wait approximately one minute before trying again.";

    case "NETWORK_ERROR":
      return "Confirm that your internet connection and development server are working.";

    case "PROVIDER_UNAVAILABLE":
      return "Wait briefly and try again. The AI provider may be experiencing a temporary service issue.";

    case "REQUEST_TIMEOUT":
      return "Try a shorter recording, fewer selected outputs, or a smaller block of notes.";

    case "UNSUPPORTED_AUDIO":
      return "Use MP3, MP4, MPEG, MPGA, M4A, WAV, or WebM audio.";

    case "FILE_TOO_LARGE":
      return "Choose or record an audio file smaller than 20 MB.";

    case "TRANSCRIPTION_FAILED":
      return "Use a clearer recording with less background noise and audible speech.";

    case "INVALID_AI_RESPONSE":
      return "Try again. The AI response did not match the required study-pack structure.";

    case "AUDIO_INPUT_ERROR":
      return "Check the selected file or microphone settings and try again.";

    case "VALIDATION_ERROR":
      return "Correct the highlighted input issue before generating the study pack.";

    default:
      return "Review the message, correct the issue, and try again.";
  }
}

function formatElapsedTime(
  totalSeconds: number,
) {
  const minutes = Math.floor(
    totalSeconds / 60,
  );

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export default function StudyWorkspace() {
  const activeRequestRef =
    useRef<AbortController | null>(
      null,
    );

  const [inputMode, setInputMode] =
    useState<InputMode>("topic");

  const [topic, setTopic] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [audioFile, setAudioFile] =
    useState<File | null>(null);

  const [
    educationLevel,
    setEducationLevel,
  ] = useState<EducationLevel>(
    "beginner",
  );

  const [
    difficulty,
    setDifficulty,
  ] = useState<QuizDifficulty>(
    "medium",
  );

  const [
    selectedOutputs,
    setSelectedOutputs,
  ] = useState<OutputId[]>(
    defaultOutputs,
  );

  const [
    requestError,
    setRequestError,
  ] =
    useState<StudyRequestError | null>(
      null,
    );

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    isPrepared,
    setIsPrepared,
  ] = useState(false);

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    generationPhase,
    setGenerationPhase,
  ] =
    useState<GenerationPhase>("idle");

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    transcript,
    setTranscript,
  ] =
    useState<StudyTranscript | null>(
      null,
    );

  const [
    studyPack,
    setStudyPack,
  ] =
    useState<StudyPack | null>(
      null,
    );

  const [
    generatedOutputs,
    setGeneratedOutputs,
  ] = useState<OutputId[]>([]);

  const [
    savedSessions,
    setSavedSessions,
  ] = useState<
    SavedStudySession[]
  >([]);

  const [
    activeSessionId,
    setActiveSessionId,
  ] =
    useState<string | null>(
      null,
    );

  const controlsDisabled =
    isGenerating || isRecording;

  const generationMessage =
    generationPhase ===
    "transcribing"
      ? "Transcribing voice note..."
      : "Generating study pack...";

  const isTakingLong =
    isGenerating &&
    elapsedSeconds >=
      LONG_REQUEST_SECONDS;

  useEffect(() => {
    setSavedSessions(
      loadSavedStudySessions(),
    );
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const timerId =
      window.setInterval(() => {
        setElapsedSeconds(
          (currentSeconds) =>
            currentSeconds + 1,
        );
      }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isGenerating]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  const sourceTitle = useMemo(() => {
    if (inputMode === "topic") {
      return (
        topic.trim() ||
        "No topic entered"
      );
    }

    if (inputMode === "notes") {
      const cleanNotes =
        notes.trim();

      if (!cleanNotes) {
        return "No notes entered";
      }

      return cleanNotes.length > 70
        ? `${cleanNotes.slice(
            0,
            70,
          )}...`
        : cleanNotes;
    }

    return (
      audioFile?.name ??
      "No audio recording selected"
    );
  }, [
    audioFile,
    inputMode,
    notes,
    topic,
  ]);

  const resultSourceTitle =
    useMemo(() => {
      if (!activeSessionId) {
        return sourceTitle;
      }

      return (
        savedSessions.find(
          (session) =>
            session.id ===
            activeSessionId,
        )?.sourceTitle ??
        sourceTitle
      );
    }, [
      activeSessionId,
      savedSessions,
      sourceTitle,
    ]);

  function clearStatusMessages() {
    setRequestError(null);
    setStatusMessage("");
    setIsPrepared(false);
  }

  function clearGeneratedContent() {
    setStudyPack(null);
    setGeneratedOutputs([]);
    setActiveSessionId(null);
  }

  function resetGeneratedResults() {
    clearStatusMessages();
    clearGeneratedContent();
  }

  function selectInputMode(
    mode: InputMode,
  ) {
    if (controlsDisabled) {
      return;
    }

    setInputMode(mode);
    resetGeneratedResults();

    if (mode !== "voice") {
      setTranscript(null);
    }
  }

  function toggleOutput(
    outputId: OutputId,
  ) {
    if (controlsDisabled) {
      return;
    }

    setSelectedOutputs(
      (currentOutputs) => {
        if (
          currentOutputs.includes(
            outputId,
          )
        ) {
          return currentOutputs.filter(
            (item) =>
              item !== outputId,
          );
        }

        return [
          ...currentOutputs,
          outputId,
        ];
      },
    );

    resetGeneratedResults();
  }

  function selectAllOutputs() {
    if (controlsDisabled) {
      return;
    }

    setSelectedOutputs(
      studyOutputs.map(
        (output) => output.id,
      ),
    );

    resetGeneratedResults();
  }

  function clearAllOutputs() {
    if (controlsDisabled) {
      return;
    }

    setSelectedOutputs([]);
    resetGeneratedResults();
  }

  function handleVoiceFileReady(
    file: File,
  ) {
    clearStatusMessages();
    clearGeneratedContent();
    setTranscript(null);

    if (
      !isSupportedAudioFile(file)
    ) {
      setAudioFile(null);

      setRequestError(
        new StudyRequestError(
          "UNSUPPORTED_AUDIO",
          "The selected audio format is not supported.",
          false,
        ),
      );

      return;
    }

    if (file.size === 0) {
      setAudioFile(null);

      setRequestError(
        new StudyRequestError(
          "VALIDATION_ERROR",
          "The selected audio recording is empty.",
          false,
        ),
      );

      return;
    }

    if (
      file.size >
      MAX_AUDIO_SIZE
    ) {
      setAudioFile(null);

      setRequestError(
        new StudyRequestError(
          "FILE_TOO_LARGE",
          "The selected audio file is larger than the 20 MB limit.",
          false,
        ),
      );

      return;
    }

    setAudioFile(file);
  }

  function handleVoiceFileRemove() {
    setAudioFile(null);
    setTranscript(null);
    resetGeneratedResults();
  }

  function handleVoiceError(
    message: string,
  ) {
    if (!message) {
      setRequestError(null);
      return;
    }

    setRequestError(
      new StudyRequestError(
        "AUDIO_INPUT_ERROR",
        message,
        false,
      ),
    );

    setStatusMessage("");
    setIsPrepared(false);
    clearGeneratedContent();
  }

  function handleRecordingChange(
    recording: boolean,
  ) {
    setIsRecording(recording);

    if (recording) {
      setRequestError(null);
      setStatusMessage("");
      setIsPrepared(false);
      setTranscript(null);
      clearGeneratedContent();
    }
  }

  function validateInput() {
    if (
      inputMode === "topic" &&
      topic.trim().length < 3
    ) {
      return "Enter a topic containing at least three characters.";
    }

    if (
      inputMode === "notes" &&
      notes.trim().length < 20
    ) {
      return "Paste at least 20 characters of study notes.";
    }

    if (
      inputMode === "voice" &&
      !audioFile
    ) {
      return "Record or select an audio file before continuing.";
    }

    if (
      inputMode === "voice" &&
      audioFile &&
      !isSupportedAudioFile(
        audioFile,
      )
    ) {
      return "Use MP3, MP4, MPEG, MPGA, M4A, WAV, or WebM audio.";
    }

    if (
      selectedOutputs.length === 0
    ) {
      return "Select at least one study output.";
    }

    return "";
  }

  async function transcribeAudio(
    file: File,
    signal: AbortSignal,
  ) {
    setGenerationPhase(
      "transcribing",
    );

    setTranscript(null);

    const formData =
      new FormData();

    formData.append(
      "audio",
      file,
    );

    const responseData =
      await requestJson<unknown>({
        url: "/api/transcribe",

        options: {
          method: "POST",
          body: formData,
        },

        externalSignal: signal,

        timeoutMilliseconds:
          CLIENT_REQUEST_TIMEOUT,
      });

    if (
      typeof responseData !==
        "object" ||
      responseData === null ||
      !("text" in responseData) ||
      typeof responseData.text !==
        "string"
    ) {
      throw new StudyRequestError(
        "INVALID_AI_RESPONSE",
        "The transcription service returned an invalid response.",
        true,
      );
    }

    const transcriptResult: StudyTranscript =
      {
        text: responseData.text.trim(),

        language:
          "language" in
            responseData &&
          typeof responseData.language ===
            "string"
            ? responseData.language
            : null,

        durationInSeconds:
          "durationInSeconds" in
            responseData &&
          typeof responseData.durationInSeconds ===
            "number"
            ? responseData.durationInSeconds
            : null,
      };

    if (
      transcriptResult.text.length <
      3
    ) {
      throw new StudyRequestError(
        "TRANSCRIPTION_FAILED",
        "No clear speech was detected in the recording.",
        true,
      );
    }

    setTranscript(
      transcriptResult,
    );

    return transcriptResult;
  }

  async function generateStudyPack(
    studyInputMode:
      | "topic"
      | "notes",
    content: string,
    signal: AbortSignal,
  ) {
    setGenerationPhase(
      "generating",
    );

    const responseData =
      await requestJson<unknown>({
        url: "/api/study",

        options: {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            inputMode:
              studyInputMode,
            content,
            educationLevel,
            difficulty,
            selectedOutputs,
          }),
        },

        externalSignal: signal,

        timeoutMilliseconds:
          CLIENT_REQUEST_TIMEOUT,
      });

    const validationResult =
      studyPackSchema.safeParse(
        responseData,
      );

    if (
      !validationResult.success
    ) {
      throw new StudyRequestError(
        "INVALID_AI_RESPONSE",
        "The AI returned a study pack that did not match the required format.",
        true,
      );
    }

    return validationResult.data;
  }

  function saveGeneratedSession({
    generatedStudyPack,
    sourceContent,
    originalInputMode,
    generatedTranscript,
  }: {
    generatedStudyPack: StudyPack;
    sourceContent: string;
    originalInputMode: InputMode;
    generatedTranscript:
      | StudyTranscript
      | null;
  }) {
    const newSession: SavedStudySession =
      {
        id: createStudySessionId(),

        createdAt:
          new Date().toISOString(),

        inputMode:
          originalInputMode,

        sourceTitle:
          sourceTitle ===
          "No audio recording selected"
            ? generatedStudyPack.title
            : sourceTitle,

        sourceContent,
        educationLevel,
        difficulty,

        generatedOutputs: [
          ...selectedOutputs,
        ],

        studyPack:
          generatedStudyPack,

        transcript:
          generatedTranscript,
      };

    const nextSessions = [
      newSession,
      ...savedSessions,
    ].slice(
      0,
      MAX_SAVED_STUDY_SESSIONS,
    );

    const wasSaved =
      saveStudySessions(
        nextSessions,
      );

    setSavedSessions(nextSessions);

    setActiveSessionId(
      newSession.id,
    );

    setStatusMessage(
      wasSaved
        ? "Study pack saved to your browser history."
        : "The study pack was generated, but browser history could not be updated.",
    );
  }

  function openSavedSession(
    session: SavedStudySession,
  ) {
    if (controlsDisabled) {
      return;
    }

    setRequestError(null);
    setIsPrepared(true);

    setStatusMessage(
      "Saved study pack opened successfully.",
    );

    setEducationLevel(
      session.educationLevel,
    );

    setDifficulty(
      session.difficulty,
    );

    setSelectedOutputs([
      ...session.generatedOutputs,
    ]);

    setStudyPack(
      session.studyPack,
    );

    setGeneratedOutputs([
      ...session.generatedOutputs,
    ]);

    setTranscript(
      session.transcript,
    );

    setAudioFile(null);

    setActiveSessionId(
      session.id,
    );

    if (
      session.inputMode ===
      "topic"
    ) {
      setInputMode("topic");
      setTopic(
        session.sourceContent,
      );
    } else {
      setInputMode("notes");
      setNotes(
        session.sourceContent,
      );
    }

    window.setTimeout(() => {
      document
        .getElementById(
          "generated-study-pack",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  function deleteSavedSession(
    sessionId: string,
  ) {
    const nextSessions =
      savedSessions.filter(
        (session) =>
          session.id !==
          sessionId,
      );

    saveStudySessions(
      nextSessions,
    );

    setSavedSessions(
      nextSessions,
    );

    if (
      activeSessionId ===
      sessionId
    ) {
      setActiveSessionId(null);
    }

    setStatusMessage(
      "Saved session deleted.",
    );
  }

  function clearStudyHistory() {
    clearSavedStudySessions();

    setSavedSessions([]);
    setActiveSessionId(null);

    setStatusMessage(
      "Study history cleared.",
    );
  }

  function cancelActiveRequest() {
    activeRequestRef.current?.abort();
  }

  async function runGeneration() {
    if (isGenerating) {
      return;
    }

    if (isRecording) {
      setRequestError(
        new StudyRequestError(
          "VALIDATION_ERROR",
          "Stop the recording before generating the study pack.",
          false,
        ),
      );

      return;
    }

    const validationError =
      validateInput();

    if (validationError) {
      setRequestError(
        new StudyRequestError(
          "VALIDATION_ERROR",
          validationError,
          false,
        ),
      );

      setStatusMessage("");
      setIsPrepared(false);

      return;
    }

    const requestController =
      new AbortController();

    activeRequestRef.current =
      requestController;

    setRequestError(null);
    setStatusMessage("");
    setIsPrepared(false);
    setIsGenerating(true);

    setGenerationPhase(
      inputMode === "voice"
        ? "transcribing"
        : "generating",
    );

    setElapsedSeconds(0);
    setStudyPack(null);
    setGeneratedOutputs([]);
    setActiveSessionId(null);

    try {
      const originalInputMode =
        inputMode;

      let studyInputMode:
        | "topic"
        | "notes";

      let content: string;

      let generatedTranscript:
        | StudyTranscript
        | null = null;

      if (
        inputMode === "voice"
      ) {
        if (!audioFile) {
          throw new StudyRequestError(
            "VALIDATION_ERROR",
            "Record or select an audio file before continuing.",
            false,
          );
        }

        generatedTranscript =
          await transcribeAudio(
            audioFile,
            requestController.signal,
          );

        studyInputMode =
          "notes";

        content =
          generatedTranscript.text;
      } else {
        setTranscript(null);

        studyInputMode =
          inputMode;

        content =
          inputMode === "topic"
            ? topic.trim()
            : notes.trim();
      }

      const generatedStudyPack =
        await generateStudyPack(
          studyInputMode,
          content,
          requestController.signal,
        );

      setStudyPack(
        generatedStudyPack,
      );

      setGeneratedOutputs([
        ...selectedOutputs,
      ]);

      setIsPrepared(true);

      saveGeneratedSession({
        generatedStudyPack,
        sourceContent: content,
        originalInputMode,
        generatedTranscript,
      });

      window.setTimeout(() => {
        document
          .getElementById(
            "generated-study-pack",
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (error) {
      const normalizedError =
        normalizeClientError(
          error,
        );

      if (
        normalizedError.code ===
        "REQUEST_CANCELLED"
      ) {
        setRequestError(null);

        setStatusMessage(
          "Generation cancelled. Your input has not been deleted.",
        );
      } else {
        setRequestError(
          normalizedError,
        );

        setStatusMessage("");
      }

      setIsPrepared(false);
    } finally {
      if (
        activeRequestRef.current ===
        requestController
      ) {
        activeRequestRef.current =
          null;
      }

      setIsGenerating(false);

      setGenerationPhase(
        "idle",
      );

      setElapsedSeconds(0);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    void runGeneration();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white">
              S
            </div>

            <div>
              <p className="font-bold leading-none">
                StudyVoice AI
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Study workspace
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            ← Back home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
            New study session
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Create your interactive
            study pack
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Enter a topic, paste notes,
            record your voice, or upload
            an audio file. StudyVoice AI
            transforms the material into
            interactive learning
            resources.
          </p>
        </div>

        <StudyHistory
          sessions={savedSessions}
          activeSessionId={
            activeSessionId
          }
          disabled={controlsDisabled}
          onOpenSession={
            openSavedSession
          }
          onDeleteSession={
            deleteSavedSession
          }
          onClearHistory={
            clearStudyHistory
          }
        />

        {statusMessage && (
          <div
            role="status"
            className="mb-7 rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-semibold text-violet-800"
          >
            {statusMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"
        >
          <div className="space-y-7">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  Step 1
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Choose your input
                  method
                </h2>
              </div>

              <div
                className="grid gap-3 sm:grid-cols-3"
                role="tablist"
                aria-label="Study input method"
              >
                {inputModes.map(
                  (mode) => {
                    const isActive =
                      inputMode ===
                      mode.id;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        role="tab"
                        aria-selected={
                          isActive
                        }
                        disabled={
                          controlsDisabled
                        }
                        onClick={() =>
                          selectInputMode(
                            mode.id,
                          )
                        }
                        className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isActive
                            ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                            : "border-slate-200 bg-white hover:border-indigo-300"
                        }`}
                      >
                        <span className="text-2xl">
                          {
                            mode.icon
                          }
                        </span>

                        <span
                          className={`mt-3 block text-sm font-bold ${
                            isActive
                              ? "text-indigo-700"
                              : "text-slate-900"
                          }`}
                        >
                          {
                            mode.title
                          }
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {
                            mode.description
                          }
                        </span>
                      </button>
                    );
                  },
                )}
              </div>

              <div className="mt-6">
                {inputMode ===
                  "topic" && (
                  <div>
                    <label
                      htmlFor="study-topic"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      What would you
                      like to study?
                    </label>

                    <input
                      id="study-topic"
                      type="text"
                      value={topic}
                      disabled={
                        controlsDisabled
                      }
                      onChange={(
                        event,
                      ) => {
                        setTopic(
                          event.target
                            .value,
                        );

                        setTranscript(
                          null,
                        );

                        resetGeneratedResults();
                      }}
                      placeholder="Example: Explain JavaScript promises to a beginner"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Enter a subject,
                      concept, question,
                      or learning
                      objective.
                    </p>
                  </div>
                )}

                {inputMode ===
                  "notes" && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <label
                        htmlFor="study-notes"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Paste your study
                        notes
                      </label>

                      <span className="text-xs text-slate-500">
                        {notes.length}{" "}
                        characters
                      </span>
                    </div>

                    <textarea
                      id="study-notes"
                      value={notes}
                      disabled={
                        controlsDisabled
                      }
                      onChange={(
                        event,
                      ) => {
                        setNotes(
                          event.target
                            .value,
                        );

                        setTranscript(
                          null,
                        );

                        resetGeneratedResults();
                      }}
                      placeholder="Paste lecture notes, textbook content, or revision material here..."
                      rows={10}
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                )}

                {inputMode ===
                  "voice" && (
                  <VoiceRecorder
                    audioFile={
                      audioFile
                    }
                    disabled={
                      isGenerating
                    }
                    maxAudioSize={
                      MAX_AUDIO_SIZE
                    }
                    onAudioReady={
                      handleVoiceFileReady
                    }
                    onRemove={
                      handleVoiceFileRemove
                    }
                    onError={
                      handleVoiceError
                    }
                    onRecordingChange={
                      handleRecordingChange
                    }
                  />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  Step 2
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Configure your study
                  pack
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="education-level"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Education level
                  </label>

                  <select
                    id="education-level"
                    value={
                      educationLevel
                    }
                    disabled={
                      controlsDisabled
                    }
                    onChange={(
                      event,
                    ) => {
                      setEducationLevel(
                        event.target
                          .value as EducationLevel,
                      );

                      resetGeneratedResults();
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="beginner">
                      Beginner
                    </option>

                    <option value="secondary">
                      Secondary school
                    </option>

                    <option value="college">
                      College or
                      university
                    </option>

                    <option value="advanced">
                      Advanced learner
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quiz-difficulty"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Quiz difficulty
                  </label>

                  <select
                    id="quiz-difficulty"
                    value={
                      difficulty
                    }
                    disabled={
                      controlsDisabled
                    }
                    onChange={(
                      event,
                    ) => {
                      setDifficulty(
                        event.target
                          .value as QuizDifficulty,
                      );

                      resetGeneratedResults();
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="easy">
                      Easy
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="challenging">
                      Challenging
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-7">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Select study
                      outputs
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Choose one or
                      more materials
                      to generate.
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={
                        controlsDisabled
                      }
                      onClick={
                        clearAllOutputs
                      }
                      className="text-sm font-bold text-slate-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      disabled={
                        controlsDisabled
                      }
                      onClick={
                        selectAllOutputs
                      }
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select all
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {studyOutputs.map(
                    (output) => {
                      const isSelected =
                        selectedOutputs.includes(
                          output.id,
                        );

                      return (
                        <button
                          key={
                            output.id
                          }
                          type="button"
                          aria-pressed={
                            isSelected
                          }
                          disabled={
                            controlsDisabled
                          }
                          onClick={() =>
                            toggleOutput(
                              output.id,
                            )
                          }
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <span className="text-xl">
                            {
                              output.icon
                            }
                          </span>

                          <span className="flex-1">
                            <span
                              className={`block text-sm font-bold ${
                                isSelected
                                  ? "text-indigo-800"
                                  : "text-slate-900"
                              }`}
                            >
                              {
                                output.title
                              }
                            </span>

                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {
                                output.description
                              }
                            </span>
                          </span>

                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                    Study pack preview
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    Generation settings
                  </h2>
                </div>

                <div
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    isRecording
                      ? "bg-red-50 text-red-700"
                      : isGenerating
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isRecording
                    ? "Recording"
                    : isGenerating
                      ? "AI working"
                      : "AI ready"}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Input method
                  </p>

                  <p className="mt-1 font-bold capitalize text-slate-900">
                    {inputMode ===
                    "voice"
                      ? "Voice note"
                      : inputMode}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Source
                  </p>

                  <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900">
                    {sourceTitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Level
                    </p>

                    <p className="mt-1 text-sm font-bold capitalize text-slate-900">
                      {
                        educationLevel
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Difficulty
                    </p>

                    <p className="mt-1 text-sm font-bold capitalize text-slate-900">
                      {difficulty}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selected outputs
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedOutputs.length >
                    0 ? (
                      selectedOutputs.map(
                        (
                          outputId,
                        ) => {
                          const output =
                            studyOutputs.find(
                              (
                                item,
                              ) =>
                                item.id ===
                                outputId,
                            );

                          return (
                            <span
                              key={
                                outputId
                              }
                              className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                            >
                              {
                                output?.title
                              }
                            </span>
                          );
                        },
                      )
                    ) : (
                      <span className="text-sm text-slate-500">
                        No outputs
                        selected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isRecording && (
                <div
                  role="status"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <p className="font-bold text-red-900">
                    Recording in
                    progress
                  </p>

                  <p className="mt-1 text-sm leading-6 text-red-700">
                    Stop the recording
                    before generating
                    your study pack.
                  </p>
                </div>
              )}

              {isGenerating && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />

                      <div>
                        <p className="font-bold text-indigo-950">
                          {
                            generationMessage
                          }
                        </p>

                        <p className="mt-1 text-sm leading-6 text-indigo-700">
                          {generationPhase ===
                          "transcribing"
                            ? "Step 1 of 2: converting your recording into text."
                            : inputMode ===
                                "voice"
                              ? "Step 2 of 2: creating your selected study materials."
                              : "Creating your selected study materials."}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 font-mono text-sm font-bold text-indigo-700">
                      {formatElapsedTime(
                        elapsedSeconds,
                      )}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-indigo-100">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-indigo-600" />
                  </div>

                  {isTakingLong && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                      This is taking
                      longer than usual.
                      You may continue
                      waiting or cancel
                      and try a shorter
                      input.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      cancelActiveRequest
                    }
                    className="mt-4 text-sm font-bold text-red-600 hover:text-red-800"
                  >
                    Cancel request
                  </button>
                </div>
              )}

              {requestError && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <p className="font-bold text-red-900">
                    Request unsuccessful
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-red-800">
                    {
                      requestError.message
                    }
                  </p>

                  <p className="mt-2 text-sm leading-6 text-red-700">
                    {getRecoveryMessage(
                      requestError.code,
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {requestError.retryable && (
                      <button
                        type="button"
                        disabled={
                          isGenerating
                        }
                        onClick={() =>
                          void runGeneration()
                        }
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Try again
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setRequestError(
                          null,
                        )
                      }
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {isPrepared &&
                !isGenerating &&
                !isRecording && (
                  <div
                    role="status"
                    className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                  >
                    <p className="font-bold text-emerald-900">
                      Study pack ready
                    </p>

                    <p className="mt-2 text-sm leading-6 text-emerald-700">
                      Your interactive
                      study materials
                      are displayed
                      below.
                    </p>
                  </div>
                )}

              <button
                type="submit"
                disabled={
                  isGenerating ||
                  isRecording
                }
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              >
                {isRecording
                  ? "Stop recording before generating"
                  : isGenerating
                    ? generationMessage
                    : "Generate study pack"}
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Requests can be
                cancelled safely. Your
                input remains available
                for another attempt.
              </p>
            </div>
          </aside>
        </form>

        {transcript && (
          <section className="mt-10 rounded-2xl border border-sky-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-2xl">
                  🎙️
                </span>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                    Voice
                    transcription
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Recording
                    transcript
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {transcript.language && (
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase text-sky-700">
                    Language:{" "}
                    {
                      transcript.language
                    }
                  </span>
                )}

                {transcript.durationInSeconds !==
                  null && (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                    Duration:{" "}
                    {Math.round(
                      transcript.durationInSeconds,
                    )}{" "}
                    seconds
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="whitespace-pre-line leading-8 text-slate-700">
                {transcript.text}
              </p>
            </div>
          </section>
        )}

        {studyPack && (
          <div
            id="generated-study-pack"
            className="scroll-mt-8"
          >
            <StudyExportActions
              studyPack={studyPack}
              generatedOutputs={
                generatedOutputs
              }
              transcript={
                transcript
              }
              sourceTitle={
                resultSourceTitle
              }
              educationLevel={
                educationLevel
              }
              difficulty={
                difficulty
              }
            />

            <StudyResults
              studyPack={studyPack}
              generatedOutputs={
                generatedOutputs
              }
            />
          </div>
        )}
      </section>
    </main>
  );
}