"use client";

import { useState } from "react";

import type { OutputId } from "@/lib/study-schema";
import type { SavedStudySession } from "@/lib/study-session";

type StudyHistoryProps = {
  sessions: SavedStudySession[];
  activeSessionId: string | null;
  disabled?: boolean;
  onOpenSession: (session: SavedStudySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearHistory: () => void;
};

const outputLabels: Record<OutputId, string> = {
  explanation: "Explanation",
  summary: "Summary",
  keyPoints: "Key points",
  flashcards: "Flashcards",
  quiz: "Quiz",
  revisionQuestions: "Revision questions",
  actionPoints: "Action points",
};

function formatSessionDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInputLabel(inputMode: SavedStudySession["inputMode"]) {
  if (inputMode === "topic") {
    return "Topic";
  }

  if (inputMode === "notes") {
    return "Notes";
  }

  return "Voice note";
}

export default function StudyHistory({
  sessions,
  activeSessionId,
  disabled = false,
  onOpenSession,
  onDeleteSession,
  onClearHistory,
}: StudyHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] =
    useState(false);

  function handleClearHistory() {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      return;
    }

    onClearHistory();
    setIsConfirmingClear(false);
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-xl">
            🕘
          </span>

          <div>
            <h2 className="font-bold text-slate-950">
              Study history
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {sessions.length === 0
                ? "Your generated study packs will appear here."
                : `${sessions.length} saved ${
                    sessions.length === 1
                      ? "session"
                      : "sessions"
                  }`}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsExpanded((currentValue) => !currentValue);
            setIsConfirmingClear(false);
          }}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-violet-400 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExpanded ? "Hide history" : "View history"}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <span className="text-3xl">📚</span>

              <h3 className="mt-3 font-bold text-slate-900">
                No saved study packs
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Generate a study pack from a topic, written notes,
                or a voice recording. The result will be saved
                automatically on this browser.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-500">
                  Select a session to reopen its transcript and
                  generated learning materials.
                </p>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleClearHistory}
                  onBlur={() => setIsConfirmingClear(false)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isConfirmingClear
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "text-red-600 hover:bg-red-50"
                  }`}
                >
                  {isConfirmingClear
                    ? "Click again to clear"
                    : "Clear history"}
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {sessions.map((session) => {
                  const isActive =
                    activeSessionId === session.id;

                  return (
                    <article
                      key={session.id}
                      className={`rounded-xl border bg-white p-4 transition ${
                        isActive
                          ? "border-violet-500 ring-1 ring-violet-500"
                          : "border-slate-200 hover:border-violet-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onOpenSession(session)}
                          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                              {getInputLabel(session.inputMode)}
                            </span>

                            {isActive && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                Open
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 truncate font-bold text-slate-950">
                            {session.studyPack.title}
                          </h3>

                          <p className="mt-1 truncate text-sm text-slate-600">
                            {session.sourceTitle}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            {formatSessionDate(session.createdAt)}
                          </p>
                        </button>

                        <button
                          type="button"
                          disabled={disabled}
                          aria-label={`Delete ${session.studyPack.title}`}
                          onClick={() => onDeleteSession(session.id)}
                          className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {session.generatedOutputs.map((outputId) => (
                          <span
                            key={outputId}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                          >
                            {outputLabels[outputId]}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onOpenSession(session)}
                        className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        Open study pack
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}