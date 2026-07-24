# StudyVoice AI

StudyVoice AI is an AI-powered learning workspace that transforms topics, written notes, and voice recordings into structured and interactive study materials.

## Live Application

**Live website:** [https://studyvoice-ai.vercel.app](https://studyvoice-ai.vercel.app)

**GitHub repository:** [https://github.com/Lewis-123/studyvoice-ai](https://github.com/Lewis-123/studyvoice-ai)

---

## Project Overview

StudyVoice AI combines three educational artificial-intelligence experiences:

1. **AI Study Assistant**  
   Generates explanations, summaries, key points, flashcards, quizzes, revision questions, and action points.

2. **Generative User Interface**  
   Converts structured AI responses into interactive learning components rather than displaying one plain block of text.

3. **Voice Notes Assistant**  
   Records or uploads audio, transcribes speech, and converts the transcript into study materials.

The application is designed to make revision faster, more organized, and more interactive.

---

## Main Features

### Multiple Input Methods

Students can create a study pack using:

- A topic or question
- Written study notes
- A browser microphone recording
- An uploaded audio recording

### AI-Generated Study Materials

StudyVoice AI can generate:

- Detailed explanations
- Concise summaries
- Key concepts
- Interactive flashcards
- Multiple-choice quizzes
- Revision questions
- Prioritized action points

### Voice Recording and Transcription

The voice workspace supports:

- Browser microphone recording
- Existing audio-file uploads
- Audio playback before submission
- Automatic speech-to-text transcription
- Detected-language information
- Recording-duration information

Supported application formats:

```text
MP3
MP4
MPEG
MPGA
M4A
WAV
WebM
```

The application limits audio uploads to 20 MB.

### Interactive Flashcards

Students can:

- Flip flashcards
- Move forward and backward
- Open a specific card
- Restart with a new generated study pack

### Interactive Quiz

Students can:

- Select answers
- Submit a completed quiz
- View their score
- Identify correct and incorrect responses
- Read an explanation for each answer
- Restart the quiz

### Action Points

Generated action points contain:

- A practical study task
- A reason for completing it
- A high, medium, or low priority
- An interactive completion control
- A completion counter

### Study History

The 10 most recent study sessions are stored in browser local storage.

Students can:

- Reopen a previous study pack
- Review saved transcripts
- Delete an individual session
- Clear their complete history
- Retain sessions after refreshing the page

History is stored only in the current browser and does not synchronize across devices.

### Study Pack Export

Generated study packs can be exported as:

- Markdown documents
- Printable documents
- PDF documents through the browser’s Save as PDF option

### Error Handling

The application handles:

- Missing API configuration
- Invalid API keys
- Provider permission problems
- Free-tier rate limiting
- API quota problems
- Unsupported audio formats
- Oversized audio files
- Empty recordings
- Failed transcription
- Network failures
- Provider outages
- Invalid structured responses
- Request timeouts
- Long generation times
- User-requested cancellation

Long-running requests display:

- The active processing stage
- Elapsed time
- A long-wait warning
- A cancellation option
- A retry option for recoverable failures

---

## AI Provider

StudyVoice AI uses Groq through the Vercel AI SDK.

### Text Model

```text
openai/gpt-oss-20b
```

The text model generates structured study packs containing the sections selected by the student.

### Transcription Model

```text
whisper-large-v3-turbo
```

The transcription model converts uploaded or recorded speech into text before the study pack is generated.

Groq free-tier access is subject to provider rate limits and model availability.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack React framework |
| React | Interactive user interface |
| TypeScript | Type-safe development |
| Tailwind CSS | Responsive styling |
| Vercel AI SDK | AI generation and transcription |
| Groq API | Study generation and speech transcription |
| Zod | Request and response validation |
| MediaRecorder API | Browser microphone recording |
| Local Storage | Persistent browser history |
| Vercel | Hosting and serverless deployment |
| GitHub | Source-code management |

---

## Application Architecture

```text
Topic, notes, or voice input
            │
            ▼
Client-side validation
            │
            ├── Input validation
            ├── Audio-format validation
            ├── File-size validation
            └── Request cancellation
            │
            ▼
Next.js API routes
            │
            ├── /api/transcribe
            │       │
            │       └── Groq Whisper transcription
            │
            └── /api/study
                    │
                    └── Groq structured generation
            │
            ▼
Zod response validation
            │
            ▼
Interactive study components
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
Study history and export tools
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
├── package-lock.json
├── README.md
└── tsconfig.json
```

---

## Local Installation

### Requirements

Install:

- Node.js
- npm
- Git
- Visual Studio Code
- A Groq API account and API key

### Clone the Repository

```bash
git clone https://github.com/Lewis-123/studyvoice-ai.git
```

Enter the project folder:

```bash
cd studyvoice-ai
```

### Install Dependencies

```bash
npm install
```

### Configure the Groq API Key

Create:

```text
.env.local
```

Add:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

Do not use:

```env
NEXT_PUBLIC_GROQ_API_KEY=gsk_your_groq_api_key_here
```

The key must remain server-side.

### Start Development Mode

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

### Development Server

```bash
npm run dev
```

### Linting

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

### Local Production Server

```bash
npm run start
```

---

## Testing

### Topic Generation

Enter:

```text
Explain the difference between synchronous and asynchronous JavaScript
```

Select several outputs and generate a study pack.

### Notes Generation

Paste at least 20 characters of study notes and generate the selected materials.

### Voice Recording

1. Select Voice Note.
2. Start recording.
3. Allow microphone access.
4. Speak clearly.
5. Stop the recording.
6. Preview the audio.
7. Generate the study pack.
8. Confirm that the transcript appears.

### Audio Upload

Upload a supported audio file smaller than 20 MB.

### Interactive Features

Confirm that:

- Flashcards flip
- Flashcard navigation works
- Quiz answers can be selected
- Quiz scoring works
- Explanations appear after quiz submission
- Action points can be marked complete
- The completion counter updates

### History

1. Generate a study pack.
2. Refresh the page.
3. Open Study History.
4. Reopen the saved session.
5. Delete a session.
6. Clear the history.

### Exports

Confirm that:

- Markdown files download
- Print view opens
- Save as PDF works
- Only generated sections appear

### Error Handling

Test:

- Empty topics
- Notes below the minimum length
- No selected outputs
- Unsupported audio
- Empty audio
- Offline browser mode
- Request cancellation
- Retry after a recoverable failure

---

## Vercel Deployment

The production application is hosted at:

[https://studyvoice-ai.vercel.app](https://studyvoice-ai.vercel.app)

The Vercel project requires this server environment variable:

```text
GROQ_API_KEY
```

Enable it for:

```text
Production
Preview
Development
```

After changing the variable, redeploy the project.

### Deployment Workflow

```text
Edit in Visual Studio Code
→ Test locally
→ Commit in GitHub Desktop
→ Push to GitHub
→ Vercel redeploys automatically
```

---

## Security and Privacy

StudyVoice AI follows these practices:

- The Groq API key remains server-side.
- The API key is excluded from Git.
- The API key is not exposed with a NEXT_PUBLIC variable.
- User input is validated before processing.
- Generated responses are validated using Zod.
- Audio format and size are checked.
- API responses use Cache-Control: no-store.
- Internal provider errors are converted into safe messages.
- Study history remains inside the user’s browser.
- Audio recordings are not saved in study history.
- Users can cancel active requests.

Never commit:

```text
.env.local
```

---

## Known Limitations

- Groq free-tier access is rate limited.
- Model availability may change.
- Study history remains in one browser.
- Clearing browser storage deletes study history.
- Voice accuracy depends on audio quality.
- Long recordings may require shorter files.
- AI-generated material may contain mistakes.
- The application does not include user accounts.
- The application does not synchronize history across devices.
- The application does not currently use a cloud database.

---

## Future Improvements

Possible enhancements include:

- User authentication
- Cloud-synchronized history
- Study folders
- Searchable sessions
- Editable transcripts
- Editable flashcards
- Timed quizzes
- Progress analytics
- Spaced repetition
- Text-to-speech
- Shareable study packs
- Teacher dashboards
- Additional AI providers

---

## Responsible Use

StudyVoice AI supports learning and revision.

Students should:

- Verify important information
- Compare results with course materials
- Understand generated work before using it
- Follow academic-integrity rules
- Avoid uploading confidential information

---

## Project Links

**Live application**

```text
https://studyvoice-ai.vercel.app
```

**GitHub repository**

```text
https://github.com/Lewis-123/studyvoice-ai
```

---

## Project Status

```text
Production deployment: Active
Groq study generation: Complete
Groq voice transcription: Complete
Browser recording: Complete
Generative user interface: Complete
Interactive flashcards: Complete
Interactive quiz: Complete
Action points: Complete
Study history: Complete
Markdown export: Complete
PDF export: Complete
Error handling: Complete
Loading states: Complete
Cancellation and retry: Complete
```

---

## License

This project was developed for educational purposes. Unless a separate license is added, all rights remain with the project contributors.