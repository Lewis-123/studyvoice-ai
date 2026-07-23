import { z } from "zod";

export const outputIdSchema = z.enum([
  "explanation",
  "summary",
  "keyPoints",
  "flashcards",
  "quiz",
  "revisionQuestions",
  "actionPoints",
]);

export type OutputId = z.infer<typeof outputIdSchema>;

export const studyRequestSchema = z.object({
  inputMode: z.enum(["topic", "notes"]),

  content: z
    .string()
    .trim()
    .min(3, "Study material is too short.")
    .max(20_000, "Study material is too long."),

  educationLevel: z.enum([
    "beginner",
    "secondary",
    "college",
    "advanced",
  ]),

  difficulty: z.enum([
    "easy",
    "medium",
    "challenging",
  ]),

  selectedOutputs: z
    .array(outputIdSchema)
    .min(1, "Select at least one study output."),
});

export const flashcardSchema = z.object({
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
});

export const quizQuestionSchema = z.object({
  question: z.string().trim().min(1),

  options: z
    .array(z.string().trim().min(1))
    .length(4),

  correctAnswerIndex: z
    .number()
    .int()
    .min(0)
    .max(3),

  explanation: z.string().trim().min(1),
});

export const actionPointSchema = z.object({
  task: z.string().trim().min(1),

  reason: z.string().trim().min(1),

  priority: z.enum([
    "high",
    "medium",
    "low",
  ]),
});

export const studyPackSchema = z.object({
  title: z.string().trim().min(1),

  explanation: z.string().trim().nullable(),

  summary: z.string().trim().nullable(),

  keyPoints: z
    .array(z.string().trim().min(1))
    .nullable(),

  flashcards: z
    .array(flashcardSchema)
    .nullable(),

  quiz: z
    .array(quizQuestionSchema)
    .nullable(),

  revisionQuestions: z
    .array(z.string().trim().min(1))
    .nullable(),

  actionPoints: z
    .array(actionPointSchema)
    .nullable(),
});

export type StudyRequest = z.infer<
  typeof studyRequestSchema
>;

export type Flashcard = z.infer<
  typeof flashcardSchema
>;

export type QuizQuestion = z.infer<
  typeof quizQuestionSchema
>;

export type ActionPoint = z.infer<
  typeof actionPointSchema
>;

export type StudyPack = z.infer<
  typeof studyPackSchema
>;