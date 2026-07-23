# StudyVoice AI

StudyVoice AI is an AI-powered learning workspace that transforms topics, written notes, and voice recordings into structured and interactive study materials.

Students can generate explanations, summaries, key points, flashcards, quizzes, revision questions, and practical action points from one study session.

## Live Application

**Live website:** [https://studyvoice-ai.vercel.app](https://studyvoice-ai.vercel.app)

**GitHub repository:** [https://github.com/Lewis-123/studyvoice-ai](https://github.com/Lewis-123/studyvoice-ai)

---

## Project Overview

StudyVoice AI combines three major artificial intelligence learning experiences:

1. **AI Study Assistant**  
   Generates clear explanations, summaries, key points, flashcards, quizzes, revision questions, and action points.

2. **Generative User Interface**  
   Displays structured AI output through interactive user-interface components instead of presenting one block of plain text.

3. **Voice Notes Assistant**  
   Allows students to record or upload audio, transcribes the recording, and converts the transcript into learning materials.

The project is designed to make study preparation faster, more interactive, and more accessible for learners at different education levels.

---

## Main Features

### Multiple Input Methods

Students can create a study pack using:

- A study topic or question
- Written lecture or revision notes
- A browser microphone recording
- An uploaded audio recording

### AI-Generated Learning Materials

StudyVoice AI can generate:

- Detailed explanations
- Concise summaries
- Key concepts and definitions
- Interactive flashcards
- Multiple-choice quizzes
- Open-ended revision questions
- Prioritized action points

### Voice Recording and Transcription

The voice workspace supports:

- Recording directly through the browser microphone
- Uploading an existing audio file
- Audio preview before submission
- Automatic speech-to-text transcription
- Detected-language information when available
- Recording-duration information when available

Supported audio formats include:

```text
MP3
MP4
MPEG
MPGA
M4A
WAV
WebM
```

The maximum supported audio-file size is 20 MB.

### Interactive Flashcards

Students can:

- Flip cards to reveal answers
- Navigate forward and backward
- Open a specific flashcard using the card indicators
- Restart with a newly generated study pack

### Interactive Quiz

The quiz interface allows students to:

- Select one answer for each question
- Submit completed answers
- View their final score
- Identify correct and incorrect responses
- Read an explanation for every answer
- Restart the quiz

### Interactive Action Points

Generated action points include:

- A practical study task
- A reason for completing the task
- High, medium, or low priority
- A completion checkbox
- A live completion counter

### Study History

The application saves the 10 most recent study sessions in browser storage.

Students can:

- Reopen a previous study pack
- Review a saved voice transcript
- Delete individual sessions
- Clear the complete history
- Retain saved sessions after refreshing the page

Study history is stored locally in the current browser. It is not synchronized across browsers or devices.

### Study Pack Export

Generated study packs can be exported as:

- A downloadable Markdown document
- A printable document
- A PDF through the browser’s **Save as PDF** option

### Reliability and Error Handling

The application handles:

- Missing API configuration
- Invalid or revoked API keys
- Insufficient API credit
- API permission errors
- Rate limiting
- Unsupported audio formats
- Oversized audio files
- Empty audio recordings
- Failed transcription
- Network failures
- Invalid AI responses
- Provider outages
- Request timeouts
- Long generation times
- User-requested cancellation

Long-running requests display:

- The current processing stage
- An elapsed-time counter
- A long-wait warning
- A cancellation control
- A retry option for recoverable failures

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack React framework |
| React | Interactive user interface |
| TypeScript | Type-safe application development |
| Tailwind CSS | Responsive interface styling |
| Vercel AI SDK | AI generation, transcription, and structured output |
| OpenAI API | Study-material generation and voice transcription |
| Zod | Input and AI-response validation |
| Web MediaRecorder API | Browser microphone recording |
| Browser Local Storage | Persistent study-session history |
| Vercel | Production hosting and serverless deployment |
| GitHub | Source-code management and collaboration |

---

## Application Architecture

StudyVoice AI uses the Next.js App Router architecture.

```text
User input
   │
   ├── Topic
   ├── Written notes
   └── Voice recording or audio upload
   │
   ▼
Client-side validation
   │
   ├── Input validation
   ├── Audio-format validation
   ├── Audio-size validation
   └── Request cancellation
   │
   ▼
Next.js API routes
   │
   ├── /api/transcribe
   │      └── Converts audio into text
   │
   └── /api/study
          └── Generates a structured study pack
   │
   ▼
Zod schema validation
   │
   ▼
Generative user-interface components
   │
   ├── Explanation
   ├── Summary
   ├── Key points
   ├── Flashcards
   ├── Quiz
   ├── Revision questions
   └── Action points
   │
   ▼
History and export tools
```

---

## Project Structure

```text
studyvoice-ai/
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── study/
│   │   │   │   └── route.ts
│   │   │   └── transcribe/
│   │   │       └── route.ts
│   │   ├── study/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── study-export-actions.tsx
│   │   ├── study-history.tsx
│   │   ├── study-results.tsx
│   │   ├── study-workspace.tsx
│   │   └── voice-recorder.tsx
│   └── lib/
│       ├── server-ai-error.ts
│       ├── study-schema.ts
│       └── study-session.ts
├── .env.local
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

---

## How the AI Integration Works

### Structured Study Generation

The `/api/study` route receives:

```json
{
  "inputMode": "topic",
  "content": "Explain asynchronous JavaScript",
  "educationLevel": "beginner",
  "difficulty": "medium",
  "selectedOutputs": [
    "explanation",
    "summary",
    "flashcards",
    "quiz"
  ]
}
```

The server uses the Vercel AI SDK and OpenAI to generate an object that follows the application’s Zod schema.

A generated response follows a structure similar to:

```json
{
  "title": "Understanding Asynchronous JavaScript",
  "explanation": "A detailed explanation...",
  "summary": "A concise summary...",
  "keyPoints": null,
  "flashcards": [
    {
      "front": "What is asynchronous programming?",
      "back": "A programming approach that allows..."
    }
  ],
  "quiz": [
    {
      "question": "Which keyword pauses an async function?",
      "options": [
        "stop",
        "wait",
        "await",
        "pause"
      ],
      "correctAnswerIndex": 2,
      "explanation": "The await keyword pauses execution..."
    }
  ],
  "revisionQuestions": null,
  "actionPoints": null
}
```

Unselected sections are returned as `null`. This keeps the response predictable and allows the interface to render only the components requested by the learner.

### Voice Transcription

The `/api/transcribe` route:

1. Receives an audio file through `FormData`.
2. Validates its format and size.
3. Converts it to a server-compatible audio buffer.
4. Sends it to the transcription model.
5. Returns the transcript, language, and duration when available.
6. Sends the transcript to the study-generation route.

---

## Getting Started Locally

### Prerequisites

Install the following tools:

- Node.js
- npm
- Git
- Visual Studio Code
- GitHub Desktop
- An OpenAI API account with available API credit

### Clone the Repository

Using Git:

```bash
git clone https://github.com/Lewis-123/studyvoice-ai.git
```

Move into the project folder:

```bash
cd studyvoice-ai
```

Alternatively, clone the repository using GitHub Desktop and open it in Visual Studio Code.

### Install Dependencies

```bash
npm install
```

### Configure the Environment Variable

Create a file named:

```text
.env.local
```

Add:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with a valid OpenAI API key.

Do not use:

```env
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

The API key must remain server-side and must never be exposed to the browser.

### Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The study workspace is available at:

```text
http://localhost:3000/study
```

---

## Available Commands

### Start Development Mode

```bash
npm run dev
```

### Run Linting

```bash
npm run lint
```

### Create a Production Build

```bash
npm run build
```

### Start the Production Build Locally

```bash
npm run start
```

---

## Testing the Application

### Topic Input Test

Enter:

```text
Explain the difference between synchronous and asynchronous JavaScript
```

Choose several study outputs and generate the study pack.

### Written Notes Test

Paste at least 20 characters of lecture or revision notes and verify that the selected learning materials appear.

### Voice Recording Test

1. Open the Voice Note tab.
2. Click **Start recording**.
3. Allow microphone access.
4. Speak clearly.
5. Stop the recording.
6. Play the audio preview.
7. Generate a study pack.
8. Confirm that the transcript appears.

### Audio Upload Test

Upload a supported MP3, MP4, MPEG, MPGA, M4A, WAV, or WebM file smaller than 20 MB.

### Interactive Feature Test

Confirm that:

- Flashcards flip correctly
- Flashcard navigation works
- Quiz answers can be selected
- Quiz scoring works
- Answer explanations appear
- Action points can be marked complete
- The completion counter updates

### History Test

1. Generate a study pack.
2. Refresh the page.
3. Open Study History.
4. Reopen the saved session.
5. Delete a saved session.
6. Test Clear History.

### Export Test

Confirm that:

- Markdown files download successfully
- The print view opens
- The browser can save the document as a PDF
- Only generated sections appear in the exported study pack

### Error Handling Test

Test the following safely:

- Submit an empty topic
- Submit notes shorter than the minimum length
- Select no study outputs
- Upload an unsupported audio format
- Upload an empty file
- Cancel an active request
- Temporarily use the browser’s offline mode to test network errors

---

## Deployment

The production version is deployed on Vercel:

[https://studyvoice-ai.vercel.app](https://studyvoice-ai.vercel.app)

### Vercel Environment Variable

The Vercel project must include:

```text
OPENAI_API_KEY
```

The variable should be enabled for:

```text
Production
Preview
Development
```

After adding or changing the variable, redeploy the application.

### Automatic Deployments

The GitHub repository is connected to Vercel.

The normal deployment workflow is:

```text
Edit in Visual Studio Code
→ Test locally
→ Commit using GitHub Desktop
→ Push to GitHub
→ Vercel deploys automatically
```

---

## Security and Privacy

StudyVoice AI follows these security practices:

- The OpenAI API key is stored only in server environment variables.
- The key is never included in client-side code.
- `.env.local` is excluded from Git tracking.
- User input is validated before AI processing.
- AI responses are validated before rendering.
- Audio files are checked for supported extensions and file size.
- API responses use `Cache-Control: no-store`.
- Provider error details are converted into safe public messages.
- Generated study history is stored only in the user’s browser.
- Uploaded or recorded audio is not saved in browser history.
- Requests can be cancelled by the user.

### Important API-Key Rule

Never commit the following file:

```text
.env.local
```

Never place the private key in a variable beginning with:

```text
NEXT_PUBLIC_
```

---

## Known Limitations

- OpenAI API usage requires a valid API key and available API credit.
- Study history is stored only in the current browser.
- History does not synchronize across devices.
- Clearing browser storage removes saved study sessions.
- Voice-transcription quality depends on audio clarity and background noise.
- Very long notes or recordings may require shorter input.
- AI-generated content should be reviewed for academic accuracy.
- The application does not currently include user accounts.
- The application does not currently use a cloud database.

---

## Future Improvements

Potential future enhancements include:

- User authentication
- Cloud-synchronized study history
- Supabase or PostgreSQL database storage
- Study folders and subjects
- Searchable session history
- Editable transcripts
- Editable flashcards
- Timed quizzes
- Progress analytics
- Quiz-performance tracking
- Spaced-repetition scheduling
- Text-to-speech study support
- Additional language support
- Collaborative study packs
- Shareable study links
- Teacher and student dashboards
- Additional AI-provider support

---

## Academic and Educational Value

StudyVoice AI demonstrates the practical use of artificial intelligence in education through:

- Structured-output generation
- Voice transcription
- Multimodal input
- Dynamic user-interface rendering
- Schema validation
- Interactive learning resources
- Responsible API-key management
- Error-resistant AI integration
- Accessible browser-based study tools

The application moves beyond a traditional chatbot by converting artificial-intelligence responses into purpose-built learning components.

---

## Responsible Use

StudyVoice AI is intended to support learning and revision.

Students should:

- Review generated information before using it academically
- Compare important facts with trusted course materials
- Avoid submitting generated work without understanding it
- Follow institutional academic-integrity requirements
- Avoid uploading confidential or personally sensitive information

AI-generated materials may occasionally contain inaccuracies or omit relevant context.

---

## Repository

```text
https://github.com/Lewis-123/studyvoice-ai
```

## Live Demo

```text
https://studyvoice-ai.vercel.app
```

---

## License

This project was developed for educational and academic purposes.

Unless a separate license file is added, all rights remain with the project contributors.

---

## Acknowledgements

StudyVoice AI was created using:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Vercel AI SDK
- OpenAI API
- Zod
- Vercel
- GitHub

---

## Project Status

```text
Production deployment: Active
Core AI study generation: Complete
Voice recording: Complete
Voice transcription: Complete
Generative user interface: Complete
Interactive quiz: Complete
Interactive flashcards: Complete
Action points: Complete
Study history: Complete
Markdown export: Complete
PDF print export: Complete
Error handling: Complete
Loading and cancellation states: Complete
```