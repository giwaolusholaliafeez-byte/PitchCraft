# PitchCraft

PitchCraft is a web app that helps hackathon builders turn a rough project idea into a clear, judge-ready pitch. It guides users through the story, improves the pitch with AI, generates a presentation outline, creates slide design directions, and exports the result as Markdown or PDF.

## Elevator Pitch

Turn your hackathon idea into a clear, judge-ready pitch in minutes.

## Why PitchCraft Exists

Hackathon teams often build useful products but struggle to explain them clearly before submission time. PitchCraft solves that final-hour storytelling problem by helping builders describe the problem, audience, solution, features, technical stack, impact, presentation flow, and next steps in one focused workspace.

## Features

- Guided pitch builder for project storytelling
- Live readiness score based on completed pitch sections
- Judge-focused checklist for missing pitch details
- Five-slide presentation outline generated from the pitch
- Backend AI assistant for improving pitch quality
- Backend AI slide designer with layout, visual direction, and speaker notes
- Saved pitch snapshots for trying alternate angles
- Markdown export for Devpost, README files, or speaker notes
- PDF export for the current pitch and saved snapshots
- Local draft persistence with `localStorage`
- Custom PitchCraft logo and favicon assets
- Responsive website UI for desktop and mobile

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- Node.js HTTP server
- Vercel serverless functions
- OpenAI Responses API
- LocalStorage
- jsPDF
- Vitest
- Oxlint

## How It Works

PitchCraft keeps the main pitch data in a typed TypeScript model. The frontend uses that model to calculate readiness, generate slide outlines, save snapshots, and export files.

AI features are handled server-side. The browser calls internal API routes, and the server calls OpenAI using `OPENAI_API_KEY`. The key is never exposed to the frontend.

## Project Structure

```text
api/                  Vercel serverless AI routes
public/               Logo, favicon, and brand image assets
server/               Shared AI backend logic and local production server
src/domain/           Pitch, AI, and storage domain types/utilities
src/services/         Frontend AI and export services
src/App.tsx           Main PitchCraft UI
src/App.css           Product website styling
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the frontend development server:

```bash
npm run dev
```

Build the full app:

```bash
npm run build
```

Run the production server locally:

```bash
npm start
```

## AI Setup

Create a local environment file:

```bash
cp .env.example .env
```

Set your OpenAI key:

```text
OPENAI_API_KEY=your_real_openai_key
OPENAI_MODEL=gpt-5.4-mini
PORT=4173
```

AI endpoints:

- `POST /api/ai/improve-pitch`
- `POST /api/ai/generate-slides`

Do not expose the OpenAI key as a `VITE_` variable. It must stay server-side.

## Exports

Users can export:

- Markdown `.md` pitch summary
- PDF pitch document
- PDF files from saved snapshots

If AI slide designs are generated, the current pitch PDF also includes design directions and speaker notes.

## Deployment

PitchCraft is ready for Vercel.

Vercel settings:

```text
Framework Preset: Vite
Build Command: npm run build:client
Output Directory: dist
```

Required Vercel environment variables:

```text
OPENAI_API_KEY=your_real_openai_key
OPENAI_MODEL=gpt-5.4-mini
```

## Verification

Run:

```bash
npm test
npm run lint
npm run build
```

## Brand Assets

- Full SVG logo: `public/pitchcraft-logo.svg`
- SVG app icon: `public/pitchcraft-mark.svg`
- Wide PNG logo: `public/pitchcraft-logo-wide.png`
- Square PNG logo: `public/pitchcraft-logo.png`
- PNG app icon: `public/pitchcraft-mark.png`

## Team Information

Solo submission:

- Product idea
- TypeScript pitch logic
- React interface
- Backend AI routes
- PDF and Markdown export
- Responsive website UI
- Testing and documentation
