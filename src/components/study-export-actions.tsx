"use client";

import { useState } from "react";

import type {
  OutputId,
  StudyPack,
} from "@/lib/study-schema";
import type { StudyTranscript } from "@/lib/study-session";

type StudyExportActionsProps = {
  studyPack: StudyPack;
  generatedOutputs: OutputId[];
  transcript: StudyTranscript | null;
  sourceTitle: string;
  educationLevel: string;
  difficulty: string;
};

function sanitizeFilename(value: string) {
  const filename = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);

  return filename || "studyvoice-study-pack";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTextAsHtml(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}

function buildMarkdown({
  studyPack,
  generatedOutputs,
  transcript,
  sourceTitle,
  educationLevel,
  difficulty,
}: StudyExportActionsProps) {
  const lines: string[] = [
    `# ${studyPack.title}`,
    "",
    `**Source:** ${sourceTitle}`,
    `**Education level:** ${formatLabel(educationLevel)}`,
    `**Quiz difficulty:** ${formatLabel(difficulty)}`,
    `**Exported:** ${new Date().toLocaleString()}`,
    "",
  ];

  function hasOutput(outputId: OutputId) {
    return generatedOutputs.includes(outputId);
  }

  if (transcript) {
    lines.push(
      "## Voice Transcript",
      "",
      transcript.text,
      "",
    );

    if (transcript.language) {
      lines.push(
        `**Detected language:** ${transcript.language}`,
        "",
      );
    }

    if (transcript.durationInSeconds !== null) {
      lines.push(
        `**Recording duration:** ${Math.round(
          transcript.durationInSeconds,
        )} seconds`,
        "",
      );
    }
  }

  if (
    hasOutput("explanation") &&
    studyPack.explanation
  ) {
    lines.push(
      "## Explanation",
      "",
      studyPack.explanation,
      "",
    );
  }

  if (hasOutput("summary") && studyPack.summary) {
    lines.push(
      "## Summary",
      "",
      studyPack.summary,
      "",
    );
  }

  if (
    hasOutput("keyPoints") &&
    studyPack.keyPoints?.length
  ) {
    lines.push(
      "## Key Points",
      "",
      ...studyPack.keyPoints.map(
        (point) => `- ${point}`,
      ),
      "",
    );
  }

  if (
    hasOutput("flashcards") &&
    studyPack.flashcards?.length
  ) {
    lines.push("## Flashcards", "");

    studyPack.flashcards.forEach(
      (flashcard, index) => {
        lines.push(
          `### Flashcard ${index + 1}`,
          "",
          `**Question:** ${flashcard.front}`,
          "",
          `**Answer:** ${flashcard.back}`,
          "",
        );
      },
    );
  }

  if (hasOutput("quiz") && studyPack.quiz?.length) {
    lines.push("## Knowledge Quiz", "");

    studyPack.quiz.forEach((question, index) => {
      lines.push(
        `### Question ${index + 1}`,
        "",
        question.question,
        "",
      );

      question.options.forEach(
        (option, optionIndex) => {
          lines.push(
            `${String.fromCharCode(
              65 + optionIndex,
            )}. ${option}`,
          );
        },
      );

      lines.push(
        "",
        `**Correct answer:** ${String.fromCharCode(
          65 + question.correctAnswerIndex,
        )}. ${
          question.options[
            question.correctAnswerIndex
          ]
        }`,
        "",
        `**Explanation:** ${question.explanation}`,
        "",
      );
    });
  }

  if (
    hasOutput("revisionQuestions") &&
    studyPack.revisionQuestions?.length
  ) {
    lines.push(
      "## Revision Questions",
      "",
      ...studyPack.revisionQuestions.map(
        (question, index) =>
          `${index + 1}. ${question}`,
      ),
      "",
    );
  }

  if (
    hasOutput("actionPoints") &&
    studyPack.actionPoints?.length
  ) {
    lines.push("## Action Points", "");

    studyPack.actionPoints.forEach(
      (actionPoint, index) => {
        lines.push(
          `### ${index + 1}. ${actionPoint.task}`,
          "",
          `**Priority:** ${formatLabel(
            actionPoint.priority,
          )}`,
          "",
          `**Reason:** ${actionPoint.reason}`,
          "",
        );
      },
    );
  }

  lines.push(
    "---",
    "",
    "Generated with StudyVoice AI.",
    "",
  );

  return lines.join("\n");
}

function buildPrintableHtml({
  studyPack,
  generatedOutputs,
  transcript,
  sourceTitle,
  educationLevel,
  difficulty,
}: StudyExportActionsProps) {
  function hasOutput(outputId: OutputId) {
    return generatedOutputs.includes(outputId);
  }

  const sections: string[] = [];

  if (transcript) {
    sections.push(`
      <section>
        <h2>Voice Transcript</h2>

        <div class="metadata-row">
          ${
            transcript.language
              ? `<span>Language: ${escapeHtml(
                  transcript.language,
                )}</span>`
              : ""
          }

          ${
            transcript.durationInSeconds !== null
              ? `<span>Duration: ${Math.round(
                  transcript.durationInSeconds,
                )} seconds</span>`
              : ""
          }
        </div>

        <p>${formatTextAsHtml(transcript.text)}</p>
      </section>
    `);
  }

  if (
    hasOutput("explanation") &&
    studyPack.explanation
  ) {
    sections.push(`
      <section>
        <h2>Explanation</h2>
        <p>${formatTextAsHtml(
          studyPack.explanation,
        )}</p>
      </section>
    `);
  }

  if (hasOutput("summary") && studyPack.summary) {
    sections.push(`
      <section class="highlight">
        <h2>Summary</h2>
        <p>${formatTextAsHtml(
          studyPack.summary,
        )}</p>
      </section>
    `);
  }

  if (
    hasOutput("keyPoints") &&
    studyPack.keyPoints?.length
  ) {
    sections.push(`
      <section>
        <h2>Key Points</h2>

        <ul>
          ${studyPack.keyPoints
            .map(
              (point) =>
                `<li>${escapeHtml(point)}</li>`,
            )
            .join("")}
        </ul>
      </section>
    `);
  }

  if (
    hasOutput("flashcards") &&
    studyPack.flashcards?.length
  ) {
    sections.push(`
      <section>
        <h2>Flashcards</h2>

        <div class="cards">
          ${studyPack.flashcards
            .map(
              (flashcard, index) => `
                <article class="card">
                  <h3>Flashcard ${index + 1}</h3>

                  <p>
                    <strong>Question:</strong>
                    ${escapeHtml(flashcard.front)}
                  </p>

                  <p>
                    <strong>Answer:</strong>
                    ${escapeHtml(flashcard.back)}
                  </p>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `);
  }

  if (hasOutput("quiz") && studyPack.quiz?.length) {
    sections.push(`
      <section>
        <h2>Knowledge Quiz</h2>

        ${studyPack.quiz
          .map(
            (question, questionIndex) => `
              <article class="question">
                <h3>
                  ${questionIndex + 1}.
                  ${escapeHtml(question.question)}
                </h3>

                <ol type="A">
                  ${question.options
                    .map(
                      (option) =>
                        `<li>${escapeHtml(
                          option,
                        )}</li>`,
                    )
                    .join("")}
                </ol>

                <p class="answer">
                  <strong>Correct answer:</strong>
                  ${String.fromCharCode(
                    65 +
                      question.correctAnswerIndex,
                  )}.
                  ${escapeHtml(
                    question.options[
                      question.correctAnswerIndex
                    ],
                  )}
                </p>

                <p>
                  <strong>Explanation:</strong>
                  ${escapeHtml(
                    question.explanation,
                  )}
                </p>
              </article>
            `,
          )
          .join("")}
      </section>
    `);
  }

  if (
    hasOutput("revisionQuestions") &&
    studyPack.revisionQuestions?.length
  ) {
    sections.push(`
      <section>
        <h2>Revision Questions</h2>

        <ol>
          ${studyPack.revisionQuestions
            .map(
              (question) =>
                `<li>${escapeHtml(question)}</li>`,
            )
            .join("")}
        </ol>
      </section>
    `);
  }

  if (
    hasOutput("actionPoints") &&
    studyPack.actionPoints?.length
  ) {
    sections.push(`
      <section>
        <h2>Action Points</h2>

        <div class="cards">
          ${studyPack.actionPoints
            .map(
              (actionPoint, index) => `
                <article class="card">
                  <h3>
                    ${index + 1}.
                    ${escapeHtml(
                      actionPoint.task,
                    )}
                  </h3>

                  <p>
                    <strong>Priority:</strong>
                    ${escapeHtml(
                      formatLabel(
                        actionPoint.priority,
                      ),
                    )}
                  </p>

                  <p>
                    <strong>Reason:</strong>
                    ${escapeHtml(
                      actionPoint.reason,
                    )}
                  </p>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `);
  }

  return `
    <!doctype html>

    <html lang="en">
      <head>
        <meta charset="utf-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <title>${escapeHtml(
          studyPack.title,
        )}</title>

        <style>
          @page {
            size: A4;
            margin: 18mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #0f172a;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
          }

          main {
            max-width: 850px;
            margin: 0 auto;
          }

          header {
            border-bottom: 3px solid #4f46e5;
            margin-bottom: 28px;
            padding-bottom: 20px;
          }

          h1 {
            margin: 0;
            font-size: 28pt;
            line-height: 1.15;
          }

          h2 {
            color: #3730a3;
            font-size: 18pt;
            margin: 0 0 14px;
          }

          h3 {
            font-size: 12pt;
            line-height: 1.5;
            margin: 0 0 8px;
          }

          p {
            margin: 0 0 12px;
          }

          section {
            break-inside: avoid;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 26px;
            padding-bottom: 22px;
          }

          ul,
          ol {
            margin: 8px 0 12px;
            padding-left: 24px;
          }

          li {
            margin-bottom: 7px;
          }

          .metadata {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px 20px;
            margin-top: 18px;
            color: #475569;
            font-size: 10pt;
          }

          .metadata-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 14px;
            color: #475569;
            font-size: 10pt;
          }

          .highlight {
            border: 1px solid #c7d2fe;
            border-radius: 10px;
            background: #eef2ff;
            padding: 18px;
          }

          .cards {
            display: grid;
            gap: 12px;
          }

          .card,
          .question {
            break-inside: avoid;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            margin-bottom: 12px;
            padding: 14px;
          }

          .answer {
            border-left: 4px solid #16a34a;
            background: #f0fdf4;
            margin-top: 12px;
            padding: 10px 12px;
          }

          footer {
            margin-top: 32px;
            border-top: 1px solid #cbd5e1;
            padding-top: 14px;
            color: #64748b;
            text-align: center;
            font-size: 9pt;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>

      <body>
        <main>
          <header>
            <h1>${escapeHtml(
              studyPack.title,
            )}</h1>

            <div class="metadata">
              <div>
                <strong>Source:</strong>
                ${escapeHtml(sourceTitle)}
              </div>

              <div>
                <strong>Education level:</strong>
                ${escapeHtml(
                  formatLabel(educationLevel),
                )}
              </div>

              <div>
                <strong>Quiz difficulty:</strong>
                ${escapeHtml(
                  formatLabel(difficulty),
                )}
              </div>

              <div>
                <strong>Exported:</strong>
                ${escapeHtml(
                  new Date().toLocaleString(),
                )}
              </div>
            </div>
          </header>

          ${sections.join("")}

          <footer>
            Generated with StudyVoice AI.
          </footer>
        </main>
      </body>
    </html>
  `;
}

export default function StudyExportActions(
  props: StudyExportActionsProps,
) {
  const [statusMessage, setStatusMessage] =
    useState("");

  function downloadMarkdown() {
    try {
      const markdown = buildMarkdown(props);

      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });

      const objectUrl =
        URL.createObjectURL(blob);

      const downloadLink =
        document.createElement("a");

      downloadLink.href = objectUrl;
      downloadLink.download = `${sanitizeFilename(
        props.studyPack.title,
      )}.md`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 0);

      setStatusMessage(
        "Markdown study pack downloaded.",
      );
    } catch {
      setStatusMessage(
        "The Markdown file could not be created.",
      );
    }
  }

  function printStudyPack() {
    const printWindow = window.open(
      "",
      "_blank",
      "width=960,height=720",
    );

    if (!printWindow) {
      setStatusMessage(
        "The print window was blocked. Allow pop-ups and try again.",
      );
      return;
    }

    try {
      printWindow.opener = null;
      printWindow.document.open();

      printWindow.document.write(
        buildPrintableHtml(props),
      );

      printWindow.document.close();

      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);

      setStatusMessage(
        "The print dialog has been opened. Select Save as PDF to create a PDF file.",
      );
    } catch {
      printWindow.close();

      setStatusMessage(
        "The printable study pack could not be created.",
      );
    }
  }

  return (
    <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xl">
            📤
          </span>

          <div>
            <h2 className="font-bold text-slate-950">
              Export study pack
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Download an editable Markdown document or
              create a clean printable PDF.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={downloadMarkdown}
            className="rounded-xl border border-indigo-300 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-50"
          >
            Download Markdown
          </button>

          <button
            type="button"
            onClick={printStudyPack}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Print or save PDF
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          {statusMessage}
        </div>
      )}
    </section>
  );
}