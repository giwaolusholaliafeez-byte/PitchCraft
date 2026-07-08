# PitchCraft

PitchCraft is a Build Beyond hackathon project that helps builders turn a rough idea into a clear, judge-ready pitch. It guides users through the problem, audience, solution, features, tech stack, impact, presentation plan, and next steps, then generates a presentation outline and Markdown export.

## The Idea

Hackathon teams often build useful projects but lose points because their presentation is rushed or unclear. PitchCraft was inspired by that final-hour pressure: teams need a fast way to explain what they built, why it matters, how it works, and what judges should pay attention to during the presentation.

## How It Works

Users fill in guided pitch fields. PitchCraft validates whether each section is strong enough, calculates a readiness score, generates a five-slide outline, saves pitch snapshots locally, and exports a Markdown summary that can be pasted into Devpost or used as presentation notes.

PitchCraft runs in the browser with `localStorage`, so deployed users can create and save drafts without an account.

## Main Features

- Guided pitch builder for hackathon project storytelling
- Readiness score based on complete pitch sections
- Live checklist showing what still needs detail
- Auto-generated five-slide presentation outline
- Backend AI assistant for improving pitches
- Backend AI slide designer for slide layout, visual direction, and speaker notes
- Saved pitch snapshots for trying alternate angles
- Markdown file export for Devpost, scripts, or presentation notes
- PDF export for the current pitch and saved pitch snapshots
- Responsive website UI for screenshots and walkthrough videos

## Technology Stack

- React
- TypeScript
- Vite
- CSS
- LocalStorage
- Node.js HTTP server
- OpenAI Responses API
- Vitest
- Oxlint

## Intended Audience

PitchCraft is designed for Build Beyond participants, beginner hackers, student teams, solo builders, mentors, and anyone who needs to communicate a technical project clearly under hackathon time pressure.

## Visual Materials

Use screenshots or a short walkthrough showing:

- Editing the project pitch fields
- The readiness score changing
- The pitch checklist
- Generated slide outline
- Saving a pitch snapshot
- Exporting Markdown

## Brand Assets

- Full logo: `public/pitchcraft-logo.svg`
- App icon/favicon: `public/pitchcraft-mark.svg`
- Wide PNG logo: `public/pitchcraft-logo-wide.png`
- Square PNG logo: `public/pitchcraft-logo.png`
- Square PNG app icon: `public/pitchcraft-mark.png`

## Source Code or Live Site

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build and serve the production preview:

```bash
npm run build
npm start
```

AI features require a server-side OpenAI key:

```bash
cp .env.example .env
# add your OPENAI_API_KEY value
npm run build
npm start
```

Set these environment variables on your deployment platform:

```text
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-5.4-mini
PORT=4173
```

The frontend never receives the API key. AI requests go through:

- `POST /api/ai/improve-pitch`
- `POST /api/ai/generate-slides`

Verify the project:

```bash
npm test
npm run lint
npm run build
```

## Deploying to Vercel

This project is Vercel-ready.

Vercel settings:

```text
Framework Preset: Vite
Build Command: npm run build:client
Output Directory: dist
```

Required environment variables:

```text
OPENAI_API_KEY=your_real_openai_key
OPENAI_MODEL=gpt-5.4-mini
```

The AI endpoints run as Vercel serverless functions:

- `/api/ai/improve-pitch`
- `/api/ai/generate-slides`

Do not expose `OPENAI_API_KEY` as a `VITE_` variable. It must stay server-side.

## Team Information

Solo submission:

- Solo Builder: product idea, TypeScript pitch logic, React interface, responsive styling, tests, and documentation.
# PitchCraft
