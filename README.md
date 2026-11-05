# RAAHI — Beyond Maps. Into Stories.

Working hackathon MVP for **Explore Local**: local heritage discovery, mystery quests, grounded quiz answers, XP/badges, Google Maps search and directions, and optional Gemini-generated trails plus real destination Q&A.

## Quick start

Requires Node.js 20+ and internet for the initial npm install.

```bash
npm install
cp .env.example .env
# Put your real GEMINI_API_KEY in .env (optional for offline trail mode)
npm run dev
```

Visit **http://localhost:5173**. The API runs on port 3001. `npm run dev` starts both services.

## Tests and build

```bash
npm test
npm run build
```

For production (after building): `NODE_ENV=production npm start` runs the API and serves React's compiled static assets on `http://localhost:3001`. Provide `GEMINI_API_KEY` through your deployment provider's server environment settings; never publish `.env` or use `VITE_GEMINI_API_KEY`.

## Features

- `/` cinematic landing page and resume trail
- `/discover` 12 Haryana Tourism source-linked destinations with city, category and hidden-gem filtering
- `/places/:slug` verified facts, source, Google Maps search, and **real Gemini Ask the Place** chat when configured
- `/plan` personalized local trail generator, AI if available / clearly labeled curated offline if not
- `/trail/:id` consecutive mystery stops, manual arrival, scored quiz unlocking, Google Maps directions, restart/resume
- `/passport` persisted XP, achievements, trail history
- Supports Ambala, Kurukshetra and Panchkula as locally clustered trail starts.

## Limitations and integrity

- The images are **illustrative Unsplash source images**, not asserted to depict their named places. Replace these with permission-cleared, location-specific images before public launch. Remote imagery may not load offline.
- Each included destination is linked to an official Haryana Tourism destination page. Some facts are city-level summaries. Verify all details before travel.
- The illustrative `visit` durations and 25-minute inter-stop buffer are **heuristic allowances, not measured travel times**. Selection does not guarantee a feasible drive or walk route.
- **Entry fees, transport costs, opening hours, road conditions, access and exact coordinates are not verified**; the app does not invent them or claim its itineraries satisfy a real financial budget. INR input is guidance only.
- No GPS or real arrival verification: visitors self-confirm that they arrived.
- Score state lives in browser localStorage and is therefore not tamper-resistant or synchronized across devices. No real-money rewards.
- AI clues are validated against allowed curated destination IDs and official quiz questions; if Gemini fails, the offline fallback is explicitly labeled. Ask the Place does **not** pretend to be AI when unavailable.
- Live Gemini API requests have **not been verified** in this environment without a real user-provided key.
- Not a certified production tourism or travel-safety service; add comprehensive rate limiting, security monitoring and data governance for significant public traffic.

## Data

`shared/places.js` is the single curated destination dataset. Each place contains official source links, basic context, a correct quiz question and verified answer. To add new regions, add source-verified entries with city/region, source and quiz, then extend `shared/trails.js` city allowlist.

## Deployment

Build and deploy the **Node server** and the compiled **dist/** folder together to a host supporting Node 20+. Static-only hosting will not serve the Gemini endpoints; offline trail generation remains possible, but Ask the Place will require the backend.
