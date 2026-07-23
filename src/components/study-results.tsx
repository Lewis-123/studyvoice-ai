"use client";

import { useEffect, useMemo, useState } from "react";

import type { OutputId, StudyPack } from "@/lib/study-schema";

type StudyResultsProps = {
  studyPack: StudyPack;
  generatedOutputs: OutputId[];
};

export default function StudyResults({
  studyPack,
  generatedOutputs,
}: StudyResultsProps) {
  const [activeFlashcard, setActiveFlashcard] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);

  useEffect(() => {
    setActiveFlashcard(0);
    setIsFlashcardFlipped(false);
    setSelectedAnswers({});
    setIsQuizSubmitted(false);
  }, [studyPack]);

  const quizScore = useMemo(() => {
    if (!studyPack.quiz) {
      return 0;
    }

    return studyPack.quiz.reduce((score, question, questionIndex) => {
      const selectedAnswer = selectedAnswers[questionIndex];

      return selectedAnswer === question.correctAnswerIndex
        ? score + 1
        : score;
    }, 0);
  }, [selectedAnswers, studyPack.quiz]);

  const flashcards = studyPack.flashcards ?? [];
  const currentFlashcard = flashcards[activeFlashcard];

  function showOutput(outputId: OutputId) {
    return generatedOutputs.includes(outputId);
  }

  function selectQuizAnswer(
    questionIndex: number,
    answerIndex: number,
  ) {
    if (isQuizSubmitted) {
      return;
    }

    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionIndex]: answerIndex,
    }));
  }

  function moveFlashcard(direction: "previous" | "next") {
    if (flashcards.length === 0) {
      return;
    }

    setIsFlashcardFlipped(false);

    setActiveFlashcard((currentIndex) => {
      if (direction === "next") {
        return (currentIndex + 1) % flashcards.length;
      }

      return (
        (currentIndex - 1 + flashcards.length) %
        flashcards.length
      );
    });
  }

  return (
    <section className="mt-10" aria-labelledby="study-results-title">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
            Generated study pack
          </p>

          <h2
            id="study-results-title"
            className="mt-2 text-3xl font-black tracking-tight"
          >
            {studyPack.title}
          </h2>
        </div>

        <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
          Generation complete
        </div>
      </div>

      <div className="space-y-7">
        {showOutput("explanation") && studyPack.explanation && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-xl">
                💡
              </span>

              <h3 className="text-xl font-bold">Explanation</h3>
            </div>

            <p className="mt-5 whitespace-pre-line leading-8 text-slate-700">
              {studyPack.explanation}
            </p>
          </article>
        )}

        {showOutput("summary") && studyPack.summary && (
          <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl">
                📄
              </span>

              <h3 className="text-xl font-bold text-indigo-950">
                Summary
              </h3>
            </div>

            <p className="mt-5 whitespace-pre-line leading-8 text-indigo-950">
              {studyPack.summary}
            </p>
          </article>
        )}

        {showOutput("keyPoints") &&
          studyPack.keyPoints &&
          studyPack.keyPoints.length > 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-xl">
                  📌
                </span>

                <h3 className="text-xl font-bold">Key points</h3>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {studyPack.keyPoints.map((keyPoint, index) => (
                  <div
                    key={`${keyPoint}-${index}`}
                    className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>

                    <p className="text-sm leading-6 text-slate-700">
                      {keyPoint}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          )}

        {showOutput("flashcards") && currentFlashcard && (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-xl">
                  🗂️
                </span>

                <div>
                  <h3 className="text-xl font-bold">Flashcards</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Card {activeFlashcard + 1} of {flashcards.length}
                  </p>
                </div>
              </div>

              <p className="text-sm font-semibold text-indigo-600">
                Click the card to flip it
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsFlashcardFlipped((currentValue) => !currentValue)
              }
              className="mt-6 flex min-h-64 w-full items-center justify-center rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-8 text-center transition hover:border-indigo-400"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  {isFlashcardFlipped ? "Answer" : "Question"}
                </p>

                <p className="mt-4 text-xl font-bold leading-8 text-slate-950 sm:text-2xl">
                  {isFlashcardFlipped
                    ? currentFlashcard.back
                    : currentFlashcard.front}
                </p>
              </div>
            </button>

            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => moveFlashcard("previous")}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
              >
                ← Previous
              </button>

              <div className="flex gap-2">
                {flashcards.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Open flashcard ${index + 1}`}
                    onClick={() => {
                      setActiveFlashcard(index);
                      setIsFlashcardFlipped(false);
                    }}
                    className={`h-2.5 w-2.5 rounded-full ${
                      index === activeFlashcard
                        ? "bg-indigo-600"
                        : "bg-slate-300"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => moveFlashcard("next")}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
              >
                Next →
              </button>
            </div>
          </article>
        )}

        {showOutput("quiz") &&
          studyPack.quiz &&
          studyPack.quiz.length > 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-xl">
                    ✅
                  </span>

                  <div>
                    <h3 className="text-xl font-bold">
                      Knowledge quiz
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Select one answer for each question.
                    </p>
                  </div>
                </div>

                {isQuizSubmitted && (
                  <div className="rounded-xl bg-emerald-100 px-4 py-2 font-black text-emerald-800">
                    Score: {quizScore}/{studyPack.quiz.length}
                  </div>
                )}
              </div>

              <div className="mt-7 space-y-8">
                {studyPack.quiz.map((question, questionIndex) => (
                  <fieldset
                    key={`${question.question}-${questionIndex}`}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <legend className="px-2 font-bold leading-7 text-slate-900">
                      {questionIndex + 1}. {question.question}
                    </legend>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => {
                        const isSelected =
                          selectedAnswers[questionIndex] === optionIndex;

                        const isCorrect =
                          optionIndex === question.correctAnswerIndex;

                        let answerStyle =
                          "border-slate-200 bg-white hover:border-indigo-300";

                        if (!isQuizSubmitted && isSelected) {
                          answerStyle =
                            "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500";
                        }

                        if (isQuizSubmitted && isCorrect) {
                          answerStyle =
                            "border-emerald-500 bg-emerald-50";
                        }

                        if (
                          isQuizSubmitted &&
                          isSelected &&
                          !isCorrect
                        ) {
                          answerStyle = "border-red-400 bg-red-50";
                        }

                        return (
                          <button
                            key={`${option}-${optionIndex}`}
                            type="button"
                            onClick={() =>
                              selectQuizAnswer(
                                questionIndex,
                                optionIndex,
                              )
                            }
                            className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${answerStyle}`}
                          >
                            <span className="mr-2 font-black text-indigo-600">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>

                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {isQuizSubmitted && (
                      <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
                        <strong>Explanation:</strong>{" "}
                        {question.explanation}
                      </div>
                    )}
                  </fieldset>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {!isQuizSubmitted ? (
                  <button
                    type="button"
                    onClick={() => setIsQuizSubmitted(true)}
                    disabled={
                      Object.keys(selectedAnswers).length !==
                      studyPack.quiz.length
                    }
                    className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Submit quiz
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAnswers({});
                      setIsQuizSubmitted(false);
                    }}
                    className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-700"
                  >
                    Try quiz again
                  </button>
                )}
              </div>
            </article>
          )}

        {showOutput("revisionQuestions") &&
          studyPack.revisionQuestions &&
          studyPack.revisionQuestions.length > 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-xl">
                  🧠
                </span>

                <h3 className="text-xl font-bold">
                  Revision questions
                </h3>
              </div>

              <ol className="mt-5 space-y-3">
                {studyPack.revisionQuestions.map(
                  (question, index) => (
                    <li
                      key={`${question}-${index}`}
                      className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <span className="font-black text-indigo-600">
                        {index + 1}.
                      </span>

                      <span className="leading-7 text-slate-700">
                        {question}
                      </span>
                    </li>
                  ),
                )}
              </ol>
            </article>
          )}
      </div>
    </section>
  );
}