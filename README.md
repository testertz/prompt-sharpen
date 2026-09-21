# Prompt Sharpen

Build a web app called "Sharpen" — a prompt enhancer that rewrites a rough

draft prompt into a clear, well-structured prompt using Claude.

STACK

- Frontend: React + Vite + Tailwind CSS

- Backend: a Vercel serverless function (Node, in /api) that proxies calls to

  the Anthropic API — never call Anthropic directly from the browser, since

  that would expose the API key

- LLM: Claude Sonnet via the Anthropic API (model: "claude-sonnet-4-6"),

  called from the serverless function using the ANTHROPIC_API_KEY environment

  variable

- Hosting: Vercel (frontend + function deployed together)

- No database — nothing needs to persist between sessions

FUNCTIONALITY

- A two-panel layout: left panel "Your draft" (a textarea for the user's rough

  prompt), right panel "Sharpened version" (read-only output).

- A segmented control / tabs at the top to choose a category: General, Code,

  Image. This changes the framing sent to the LLM (e.g. "for a general-purpose

  AI chatbot", "for an AI coding assistant", "for an AI image generation

  model").

- A "Sharpen it" button (disabled while loading or when the draft is empty)

  that POSTs { draft, category } to the serverless function.

- The serverless function builds a prompt instructing Claude to:

  - preserve the original intent and constraints, not invent new requirements

  - add missing but clearly useful specificity (format, scope, audience, tone,

    examples) only when it meaningfully helps

  - stay concise, no filler

  - rewrite the prompt only, never answer it

  - return ONLY valid JSON, no markdown fences or commentary, in this exact

    shape: { "enhanced_prompt": string, "why": string[] }, where "why" is

    2-4 short bullets (under 12 words each) naming the specific improvements

    made to that prompt

  Use Claude's tool-calling (a single tool with an input schema matching that

  shape) to force reliable structured output rather than relying on the model

  to naturally return clean JSON.

- The function validates/parses the model's structured response and returns

  { enhanced_prompt, why } as JSON, or a clear error object on failure.

- Frontend shows a loading indicator while waiting for the response.

- On success: show the sharpened prompt in the output panel with a "Copy"

  button, and the "why" bullets below it under a "What changed" heading.

- On failure: handle these cases distinctly with short, clear inline messages

  (never raw stack traces or raw API errors):

  - rate limiting (429 from Anthropic)

  - auth/config errors (missing or invalid API key)

  - malformed/unparseable model response

  - network/timeout errors

- Character count under the draft textarea.

- Keyboard shortcut: Cmd/Ctrl+Enter triggers "Sharpen it".

- No client-side or server-side persistence — everything lives in memory for

  the duration of the request/session only.

DESIGN

- Two distinct type families: a serif display face for the wordmark/headline

  and a clean sans for UI text; use a monospace face for the draft/output text

  areas since they hold literal prompt text. Load fonts via Google Fonts or a

  self-hosted equivalent.

- A calm, editorial aesthetic — avoid generic SaaS-card styling (no identical

  rounded cards with uniform drop shadows) and avoid the clichéd "AI app" look

  (no warm cream background with an orange/terracotta accent, no near-black

  background with a single neon accent). Use a quiet palette: soft paper

  background in light mode, deep neutral background in dark mode, and one

  deliberate accent color (a muted teal/forest tone) used sparingly for the

  primary button and highlights.

- Fully responsive: two columns side by side on desktop, stacked on mobile.

- Support both light and dark mode via prefers-color-scheme, driven through

  Tailwind's dark mode class or media strategy.

- Sentence case labels, no ALL CAPS, minimal chrome, generous whitespace.

PROJECT STRUCTURE

- /src — React app (components: DraftPanel, OutputPanel, CategoryTabs, App)

- /api/sharpen.js (or .ts) — Vercel serverless function calling Anthropic

- .env.example documenting ANTHROPIC_API_KEY

- README with setup steps: install, set env var, `vercel dev` locally, deploy

  with `vercel`

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bd8eab63-e5e8-4ac5-8eaf-a6c86af8bfed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
