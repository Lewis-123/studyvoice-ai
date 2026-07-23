import { z } from "zod";

import {
  outputIdSchema,
  studyPackSchema,
} from "@/lib/study-schema";

export const STUDY_HISTORY_STORAGE_KEY =
  "studyvoice-ai:study-history:v1";

export const MAX_SAVED_STUDY_SESSIONS = 10;

export const studySessionInputModeSchema = z.enum([
  "topic",
  "notes",
  "voice",
]);

export const studySessionEducationLevelSchema = z.enum([
  "beginner",
  "secondary",
  "college",
  "advanced",
]);

export const studySessionQuizDifficultySchema = z.enum([
  "easy",
  "medium",
  "challenging",
]);

export const studyTranscriptSchema = z.object({
  text: z.string().trim().min(1),
  language: z.string().nullable(),
  durationInSeconds: z.number().nonnegative().nullable(),
});

export const savedStudySessionSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),

  inputMode: studySessionInputModeSchema,

  sourceTitle: z.string().trim().min(1).max(200),
  sourceContent: z.string().trim().min(1).max(20_000),

  educationLevel: studySessionEducationLevelSchema,
  difficulty: studySessionQuizDifficultySchema,

  generatedOutputs: z.array(outputIdSchema).min(1),
  studyPack: studyPackSchema,

  transcript: studyTranscriptSchema.nullable(),
});

const studyHistoryPayloadSchema = z.object({
  version: z.literal(1),
  sessions: z.array(savedStudySessionSchema),
});

export type StudySessionInputMode = z.infer<
  typeof studySessionInputModeSchema
>;

export type StudySessionEducationLevel = z.infer<
  typeof studySessionEducationLevelSchema
>;

export type StudySessionQuizDifficulty = z.infer<
  typeof studySessionQuizDifficultySchema
>;

export type StudyTranscript = z.infer<
  typeof studyTranscriptSchema
>;

export type SavedStudySession = z.infer<
  typeof savedStudySessionSchema
>;

export function createStudySessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function loadSavedStudySessions(): SavedStudySession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(
      STUDY_HISTORY_STORAGE_KEY,
    );

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    const validationResult =
      studyHistoryPayloadSchema.safeParse(parsedValue);

    if (!validationResult.success) {
      window.localStorage.removeItem(
        STUDY_HISTORY_STORAGE_KEY,
      );

      return [];
    }

    return validationResult.data.sessions
      .sort(
        (firstSession, secondSession) =>
          new Date(secondSession.createdAt).getTime() -
          new Date(firstSession.createdAt).getTime(),
      )
      .slice(0, MAX_SAVED_STUDY_SESSIONS);
  } catch {
    return [];
  }
}

export function saveStudySessions(
  sessions: SavedStudySession[],
) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const limitedSessions = sessions.slice(
      0,
      MAX_SAVED_STUDY_SESSIONS,
    );

    const payload = studyHistoryPayloadSchema.parse({
      version: 1,
      sessions: limitedSessions,
    });

    window.localStorage.setItem(
      STUDY_HISTORY_STORAGE_KEY,
      JSON.stringify(payload),
    );

    return true;
  } catch {
    return false;
  }
}

export function clearSavedStudySessions() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(
      STUDY_HISTORY_STORAGE_KEY,
    );

    return true;
  } catch {
    return false;
  }
}