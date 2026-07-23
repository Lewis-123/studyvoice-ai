import { z } from "zod";

export const outputIdSchema = z.enum([
  "explanation",
  "summary",
  "keyPoints",
  "flashcards",
  "quiz",
  "revisionQuestions",
]);

export type OutputId = z.infer<typeof outputIdSchema>;

export const studyRequestSchema = z.object({
  inputMode: z.enum(["topic", "notes"]),
  content: z.string().min(3).max(20_000),
  educationLevel: z.enum([
    "beginner",
    "secondary",
    "college",
    "advanced",
  ]),
  difficulty: z.enum(["easy", "medium", "challenging"]),
  selectedOutputs: z.array(outputIdSchema).min(1),
});

export const studyPackSchema = z.object({
  title: z.string(),

  explanation: z.string().nullable(),

  summary: z.string().nullable(),

  keyPoints: z.array(z.string()).nullable(),

  flashcards: z
    .array(
      z.object({
        front: z.string(),
        back: z.string(),
      }),
    )
    .nullable(),

  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        correctAnswerIndex: z.number().int().min(0).max(3),
        explanation: z.string(),
      }),
    )
    .nullable(),

  revisionQuestions: z.array(z.string()).nullable(),
});

export type StudyPack = z.infer<typeof studyPackSchema>;