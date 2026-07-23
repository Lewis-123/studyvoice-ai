import Link from "next/link";

const features = [
  {
    icon: "🧠",
    title: "AI Study Assistant",
    description:
      "Turn any topic or class notes into clear explanations, summaries, key concepts, and revision questions.",
  },
  {
    icon: "🎙️",
    title: "Voice Notes Assistant",
    description:
      "Record or upload a voice note, generate a transcript, summarize it, and extract important action points.",
  },
  {
    icon: "✨",
    title: "Generative Learning UI",
    description:
      "Interact with flashcards, quizzes, checklists, study cards, and progress results instead of receiving plain text.",
  },
];

const studyOutputs = [
  "Clear explanation",
  "Concise summary",
  "Key concepts",
  "Interactive flashcards",
  "Multiple-choice quiz",
  "Revision questions",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
              S
            </div>

            <div>
              <p className="text-lg font-bold leading-none">StudyVoice AI</p>
              <p className="mt-1 text-xs text-slate-500">
                Learn smarter with AI
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
              How it works
            </a>

            <a
              href="#about"
              className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
              About
            </a>
          </div>

          <Link
            href="/study"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Start studying
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-100/70 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              <span>✨</span>
              Powered by the Vercel AI SDK
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Transform your notes into an{" "}
              <span className="text-indigo-600">
                interactive study experience
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Enter a topic, paste your notes, or record your voice. StudyVoice
              AI creates explanations, summaries, flashcards, quizzes, and
              revision materials in seconds.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/study"
                className="rounded-xl bg-indigo-600 px-7 py-3.5 text-center font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                Create a study pack
              </Link>

              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-center font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                See how it works
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-600">
              <span>✓ Topic input</span>
              <span>✓ Voice transcription</span>
              <span>✓ Interactive quizzes</span>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/70 sm:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="font-bold text-slate-900">New study session</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose how you want to study
                  </p>
                </div>

                <div className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  AI ready
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  className="rounded-xl border-2 border-indigo-500 bg-indigo-50 p-4 text-center"
                >
                  <span className="block text-2xl">⌨️</span>
                  <span className="mt-2 block text-xs font-bold text-indigo-700">
                    Topic
                  </span>
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-indigo-300"
                >
                  <span className="block text-2xl">📝</span>
                  <span className="mt-2 block text-xs font-bold text-slate-700">
                    Notes
                  </span>
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-indigo-300"
                >
                  <span className="block text-2xl">🎙️</span>
                  <span className="mt-2 block text-xs font-bold text-slate-700">
                    Voice
                  </span>
                </button>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="topic-preview"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  What would you like to study?
                </label>

                <div
                  id="topic-preview"
                  className="min-h-28 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500"
                >
                  Explain artificial intelligence and machine learning to a
                  beginner...
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-950 p-4 text-white">
                <div>
                  <p className="text-sm font-semibold">Generate study pack</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Summary, flashcards and quiz
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500">
                  →
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:block">
              <p className="text-xs font-semibold text-slate-500">Quiz score</p>
              <p className="mt-1 text-2xl font-black text-emerald-600">8/10</p>
            </div>

            <div className="absolute -right-5 -top-6 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:block">
              <p className="text-xs font-semibold text-slate-500">
                Flashcards created
              </p>
              <p className="mt-1 text-2xl font-black text-indigo-600">12</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
              Core features
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              One platform, three powerful AI experiences
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              StudyVoice AI combines intelligent content generation, audio
              transcription, and interactive learning components.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                  {feature.icon}
                </div>

                <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
              How it works
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              From raw information to a complete study pack
            </h2>

            <div className="mt-8 space-y-6">
              {[
                {
                  number: "01",
                  title: "Add your learning material",
                  text: "Type a topic, paste written notes, or record and upload a voice note.",
                },
                {
                  number: "02",
                  title: "Let AI process the content",
                  text: "The system analyzes the material, identifies key concepts, and organizes the information.",
                },
                {
                  number: "03",
                  title: "Study interactively",
                  text: "Review summaries, flip flashcards, answer quiz questions, and track your results.",
                },
              ].map((step) => (
                <div key={step.number} className="flex gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">
                    {step.number}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-2 leading-7 text-slate-600">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
              Your study pack
            </p>

            <h3 className="mt-3 text-2xl font-bold">
              Everything you need to understand and revise
            </h3>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {studyOutputs.map((output, index) => (
                <div
                  key={output}
                  className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold">{output}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-indigo-600 py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
          <h2 className="text-3xl font-black sm:text-4xl">
            Ready to make studying more effective?
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-indigo-100">
            Create an interactive study pack from a topic, written notes, or a
            voice recording.
          </p>

          <Link
            href="/study"
            className="mt-8 rounded-xl bg-white px-8 py-3.5 font-bold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-50"
          >
            Start studying now
          </Link>
        </div>
      </section>

      <footer className="bg-slate-950 py-8 text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-center text-sm sm:flex-row lg:px-8">
          <p>© 2026 StudyVoice AI. Team AI SDK.</p>
          <p>Built with Next.js and the Vercel AI SDK.</p>
        </div>
      </footer>
    </main>
  );
}