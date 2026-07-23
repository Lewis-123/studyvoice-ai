"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import StudyResults from "@/components/study-results";
import type { OutputId, StudyPack } from "@/lib/study-schema";

type InputMode = "topic" | "notes" | "voice";

type StudyOutput = {
  id: OutputId;
  title: string;
  description: string;
  icon: string;
};

const MAX_AUDIO_SIZE = 20 * 1024 * 1024;

const inputModes: Array<{
  id: InputMode;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    id: "topic",
    title: "Enter topic",
    description: "Generate a study pack from a subject or question.",
    icon: "⌨️",
  },
  {
    id: "notes",
    title: "Paste notes",
    description: "Transform written notes into revision materials.",
    icon: "📝",
  },
  {
    id: "voice",
    title: "Voice note",
    description: "Upload an audio recording for transcription.",
    icon: "🎙️",
  },
];

const studyOutputs: StudyOutput[] = [
  {
    id: "explanation",
    title: "Explanation",
    description: "A clear, detailed explanation of the material.",
    icon: "💡",
  },
  {
    id: "summary",
    title: "Summary",
    description: "A concise overview of the main information.",
    icon: "📄",
  },
  {
    id: "keyPoints",
    title: "Key points",
    description: "The most important concepts and definitions.",
    icon: "📌",
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Interactive question-and-answer revision cards.",
    icon: "🗂️",
  },
  {
    id: "quiz",
    title: "Quiz",
    description: "Multiple-choice questions with explanations.",
    icon: "✅",
  },
  {
    id: "revisionQuestions",
    title: "Revision questions",
    description: "Open-ended questions for deeper practice.",
    icon: "🧠",
  },
];

const defaultOutputs: OutputId[] = [
  "explanation",
  "summary",
  "flashcards",
  "quiz",
];

export default function StudyWorkspace() {
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>("topic");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [educationLevel, setEducationLevel] = useState("beginner");
  const [difficulty, setDifficulty] = useState("medium");

  const [selectedOutputs, setSelectedOutputs] =
    useState<OutputId[]>(defaultOutputs);

  const [errorMessage, setErrorMessage] = useState("");
  const [isPrepared, setIsPrepared] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [studyPack, setStudyPack] = useState<StudyPack | null>(null);
  const [generatedOutputs, setGeneratedOutputs] = useState<OutputId[]>([]);

  const sourceTitle = useMemo(() => {
    if (inputMode === "topic") {
      return topic.trim() || "No topic entered";
    }

    if (inputMode === "notes") {
      const cleanNotes = notes.trim();

      if (!cleanNotes) {
        return "No notes entered";
      }

      return cleanNotes.length > 70
        ? `${cleanNotes.slice(0, 70)}...`
        : cleanNotes;
    }

    return audioFile?.name ?? "No audio file selected";
  }, [audioFile, inputMode, notes, topic]);

  function clearStatusMessages() {
    setErrorMessage("");
    setIsPrepared(false);
  }

  function selectInputMode(mode: InputMode) {
    setInputMode(mode);
    clearStatusMessages();
  }

  function toggleOutput(outputId: OutputId) {
    setSelectedOutputs((currentOutputs) => {
      if (currentOutputs.includes(outputId)) {
        return currentOutputs.filter((item) => item !== outputId);
      }

      return [...currentOutputs, outputId];
    });

    clearStatusMessages();
  }

  function selectAllOutputs() {
    setSelectedOutputs(studyOutputs.map((output) => output.id));
    clearStatusMessages();
  }

  function handleAudioChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    clearStatusMessages();

    if (!selectedFile) {
      setAudioFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("audio/")) {
      setAudioFile(null);
      event.target.value = "";
      setErrorMessage("Please select a valid audio file.");
      return;
    }

    if (selectedFile.size > MAX_AUDIO_SIZE) {
      setAudioFile(null);
      event.target.value = "";
      setErrorMessage(
        "The selected audio file is larger than the prototype limit of 20 MB.",
      );
      return;
    }

    setAudioFile(selectedFile);
  }

  function removeAudioFile() {
    setAudioFile(null);

    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }

    clearStatusMessages();
  }

  function validateInput() {
    if (inputMode === "topic" && topic.trim().length < 3) {
      return "Enter a topic containing at least three characters.";
    }

    if (inputMode === "notes" && notes.trim().length < 20) {
      return "Paste at least 20 characters of study notes.";
    }

    if (inputMode === "voice" && !audioFile) {
      return "Select an audio file before continuing.";
    }

    if (selectedOutputs.length === 0) {
      return "Select at least one study output.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateInput();

    if (validationError) {
      setErrorMessage(validationError);
      setIsPrepared(false);
      return;
    }

    if (inputMode === "voice") {
      setErrorMessage(
        "Voice transcription is not connected yet. Use Topic or Notes for this step.",
      );
      setIsPrepared(false);
      return;
    }

    const content =
      inputMode === "topic" ? topic.trim() : notes.trim();

    setErrorMessage("");
    setIsPrepared(false);
    setIsGenerating(true);
    setStudyPack(null);

    try {
      const response = await fetch("/api/study", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputMode,
          content,
          educationLevel,
          difficulty,
          selectedOutputs,
        }),
      });

      const responseData: unknown = await response.json();

      if (!response.ok) {
        const apiError =
          typeof responseData === "object" &&
          responseData !== null &&
          "error" in responseData &&
          typeof responseData.error === "string"
            ? responseData.error
            : "The study pack could not be generated.";

        throw new Error(apiError);
      }

      setStudyPack(responseData as StudyPack);
      setGeneratedOutputs([...selectedOutputs]);
      setIsPrepared(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setErrorMessage(message);
      setIsPrepared(false);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white">
              S
            </div>

            <div>
              <p className="font-bold leading-none">StudyVoice AI</p>
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
            Create your interactive study pack
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Enter a topic, paste notes, or upload a voice recording.
            Choose the learning materials that StudyVoice AI should
            prepare.
          </p>
        </div>

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
                  Choose your input method
                </h2>
              </div>

              <div
                className="grid gap-3 sm:grid-cols-3"
                role="tablist"
                aria-label="Study input method"
              >
                {inputModes.map((mode) => {
                  const isActive = inputMode === mode.id;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => selectInputMode(mode.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        isActive
                          ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white hover:border-indigo-300"
                      }`}
                    >
                      <span className="text-2xl">{mode.icon}</span>

                      <span
                        className={`mt-3 block text-sm font-bold ${
                          isActive
                            ? "text-indigo-700"
                            : "text-slate-900"
                        }`}
                      >
                        {mode.title}
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {mode.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                {inputMode === "topic" && (
                  <div>
                    <label
                      htmlFor="study-topic"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      What would you like to study?
                    </label>

                    <input
                      id="study-topic"
                      type="text"
                      value={topic}
                      disabled={isGenerating}
                      onChange={(event) => {
                        setTopic(event.target.value);
                        clearStatusMessages();
                      }}
                      placeholder="Example: Explain JavaScript promises to a beginner"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Enter a subject, concept, question, or learning
                      objective.
                    </p>
                  </div>
                )}

                {inputMode === "notes" && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <label
                        htmlFor="study-notes"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Paste your study notes
                      </label>

                      <span className="text-xs text-slate-500">
                        {notes.length} characters
                      </span>
                    </div>

                    <textarea
                      id="study-notes"
                      value={notes}
                      disabled={isGenerating}
                      onChange={(event) => {
                        setNotes(event.target.value);
                        clearStatusMessages();
                      }}
                      placeholder="Paste lecture notes, textbook content, or revision material here..."
                      rows={10}
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                )}

                {inputMode === "voice" && (
                  <div>
                    <label
                      htmlFor="audio-file"
                      className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      <span className="block text-4xl">🎧</span>

                      <span className="mt-4 block font-bold text-slate-900">
                        Select an audio recording
                      </span>

                      <span className="mt-2 block text-sm text-slate-500">
                        Choose a lecture, discussion, or personal
                        voice note
                      </span>

                      <span className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                        Browse audio files
                      </span>
                    </label>

                    <input
                      ref={audioInputRef}
                      id="audio-file"
                      type="file"
                      accept="audio/*"
                      disabled={isGenerating}
                      onChange={handleAudioChange}
                      className="sr-only"
                    />

                    {audioFile && (
                      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-emerald-900">
                            {audioFile.name}
                          </p>

                          <p className="mt-1 text-xs text-emerald-700">
                            {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={removeAudioFile}
                          className="shrink-0 text-sm font-bold text-emerald-800 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  Step 2
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Configure your study pack
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
                    value={educationLevel}
                    disabled={isGenerating}
                    onChange={(event) => {
                      setEducationLevel(event.target.value);
                      clearStatusMessages();
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="secondary">
                      Secondary school
                    </option>
                    <option value="college">
                      College or university
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
                    value={difficulty}
                    disabled={isGenerating}
                    onChange={(event) => {
                      setDifficulty(event.target.value);
                      clearStatusMessages();
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="challenging">
                      Challenging
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Select study outputs
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Choose one or more materials to generate.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={selectAllOutputs}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Select all
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {studyOutputs.map((output) => {
                    const isSelected = selectedOutputs.includes(
                      output.id,
                    );

                    return (
                      <button
                        key={output.id}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={isGenerating}
                        onClick={() => toggleOutput(output.id)}
                        className={`flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        <span className="text-xl">
                          {output.icon}
                        </span>

                        <span className="flex-1">
                          <span
                            className={`block text-sm font-bold ${
                              isSelected
                                ? "text-indigo-800"
                                : "text-slate-900"
                            }`}
                          >
                            {output.title}
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {output.description}
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
                  })}
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
                    isGenerating
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isGenerating ? "AI working" : "AI ready"}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Input method
                  </p>

                  <p className="mt-1 font-bold capitalize text-slate-900">
                    {inputMode}
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
                      {educationLevel}
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
                    {selectedOutputs.length > 0 ? (
                      selectedOutputs.map((outputId) => {
                        const output = studyOutputs.find(
                          (item) => item.id === outputId,
                        );

                        return (
                          <span
                            key={outputId}
                            className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                          >
                            {output?.title}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-sm text-slate-500">
                        No outputs selected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isGenerating && (
                <div
                  role="status"
                  className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />

                    <div>
                      <p className="font-bold text-indigo-900">
                        Generating your study pack
                      </p>

                      <p className="mt-1 text-sm leading-6 text-indigo-700">
                        StudyVoice AI is analyzing the material and
                        preparing the selected learning resources.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              {isPrepared && !isGenerating && (
                <div
                  role="status"
                  className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <p className="font-bold text-emerald-900">
                    Study pack generated successfully
                  </p>

                  <p className="mt-2 text-sm leading-6 text-emerald-700">
                    Your interactive study materials are displayed
                    below.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              >
                {isGenerating
                  ? "Generating study pack..."
                  : "Generate study pack"}
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Topic and notes generation are connected. Voice
                transcription will be added next.
              </p>
            </div>
          </aside>
        </form>

        {studyPack && (
          <StudyResults
            studyPack={studyPack}
            generatedOutputs={generatedOutputs}
          />
        )}
      </section>
    </main>
  );
}