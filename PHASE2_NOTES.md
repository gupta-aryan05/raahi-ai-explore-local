# RAAHI Phase 2 — homepage-focused upgrade

## What changed
- Cinematic All-India visual-reference-inspired homepage with original artwork clearly labeled illustrative.
- Overlaid navigation with search and India links, responsive menu, and consistent secondary-page header.
- Six working shortcut links to existing routes (the sixth is **Adjust My Journey**, which begins a new plan, not true mid-trip replan).
- Photo-led editorial cards for six *existing* destinations. Four use Wikimedia Commons location-specific photographs and two use honest placeholders; filter and favorite controls work.
- Explorer Passport home section reads actual saved XP, completions and earned badges.
- Existing routes, destination database, Gemini backend, quizzes, Wallet and TasteTrail are untouched.

## What is intentionally not claimed
- This does not implement true mid-trip replanning; the shortcut starts a new planning session.
- Homepage hero is an original visual **illustration** rather than a documentary photo of the Taj Mahal.
- External Wikimedia photos require internet; failures get a labeled fallback.
- Featured city coverage is limited to the existing 16 place records, not every state of India.

## Testing
- `npm test`: 11 tests passed in the authoring environment.
- TSX syntactic transpilation: no diagnostics.
- Production build requires npm-installed dependencies, which are unavailable in this authoring environment; run `npm ci && npm run build` locally.

## Start locally
`npm ci` then `npm run dev`. Make a new `.env` based on `.env.example` in the project root for live Gemini.

## Deployment
Test the local homepage and other routes before committing this upgrade; keep existing Render deployment untouched until verified.
