# Plotify

A personal media journal for tracking where you left off across everything you watch and read.

## The Problem

I love watching shows and reading books, manga, and long-form content — often from many different sources at once. Streaming sites, reading apps, browser tabs, notes apps… the content is everywhere, but my progress is not.

The question that kept coming up: **where do I store the last episode I watched or the last page I read?** Notes get lost, bookmarks pile up, and I forget where I stopped. Plotify is my answer — one quiet place to log progress and pick up exactly where I left off.

## Features

### Shelves & progress
- **Screen shelf**: shows, series, movies and anime, counted by episode.
- **Read shelf**: books and manga, counted by page or chapter.
- **One-tap logging**: +1 / −1 from the shelf (grid or list view) or the detail card, with search across each shelf.
- **Seasons & volumes**: every season keeps its own progress, status and rating. "Next season" either keeps counting (30 → 31) or starts from 0, and earlier seasons stay on the list. Switch between seasons, add a skipped one by hand, or delete one. Several seasons can run at once, e.g. rewatching season 1 while season 2 is still going.
- **Finished & ratings**: each season is rated 1–5 when it's finished. The title's rating is the average of its seasons, and it moves to the finished shelf once no season is left running.
- **Rewatch / reread**: restart from season 1 or from a season you pick. The episode goes back to 0 after a confirmation, a "rewatch ×N" badge counts the rounds, and ratings are kept.

### Adding titles
- **Title lookup**: as you type, matches from TMDB (movies & series), AniList (anime & manga) and Open Library (books) fill in the cover, description and categories. Every field stays editable.
- **Covers**: pick from the recommended covers, or upload / drag & drop your own image and crop it to fit (3:4 covers, square profile photos). You can always go back to the recommended or default cover.
- **Bulk add**: paste a whole list, one title per line. Each one is matched automatically, and title, cover, description, categories, status, rating and progress can be changed per row before up to 50 are added at once. Made for moving a backlog over from somewhere else.
- **Import from other apps**: drop a Letterboxd export (.zip), a MyAnimeList anime or manga list (.xml / .xml.gz) or a Goodreads library (.csv) on `/add/import`. The file is read in the browser; ratings, progress and finish dates come along, covers and genres are matched in batches (TMDB, AniList by MAL id, Open Library by ISBN), and titles already on the shelf are skipped.

### Around the app
- **Ask your shelf**: a chat assistant (Gemini, with retrieval over your own entries) that answers questions about your list.
- **Profile**: stats, favourites, rating spread and top categories. Edit your name and photo, change your password, or delete your account.
- **Yearly recap**: a story-style look back at the year (`/recap/:year`): titles finished, episodes and pages, busiest month, top genres, highest rated, first and last finish, and a playful persona, with a 1080×1920 image to save or share. Each year opens on December 1st; the navbar points to it through December and January, and past years stay on the profile.
- **Rate the app**: a small popup on the second day you open plotify (or from the footer) stores a 1–5 rating and an optional comment.
- **Support page**: `/donate` links to Saweria (Indonesia: QRIS, e-wallets) and Ko-fi (international). A link that isn't configured shows as "coming soon".
- **Chrome extension**: log progress, finish a season or move to the next one, and add new titles from the tab you're on. See [`PlotifyExtension/README.md`](PlotifyExtension/README.md).
- **Authentication**: sign up, sign in, forgot/reset password, and Google SSO via Clerk.

## Live

| Surface | URL |
|---------|-----|
| **Frontend** | [https://yourplotify.site](https://yourplotify.site) |
| **Backend API** | [https://plotify-backend-drab.vercel.app](https://plotify-backend-drab.vercel.app) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query (persisted cache), Motion, react-easy-crop, Axios |
| **Backend** | Node.js, Express 5 (serverless on Vercel) |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Storage** | Supabase Storage (media covers & profile images) |
| **Auth** | Clerk |
| **AI** | Google Gemini (chat + embeddings) |
| **Title data** | TMDB, AniList, Open Library |
| **Extension** | Chrome Manifest V3, React, Vite, Clerk Chrome Extension SDK |
| **Deployment** | Frontend → [Vercel](https://vercel.com) · Backend → [Vercel](https://vercel.com) |

## Project Structure

```
Plotify/
├── PlotifyFrontend/   # React + Vite web app
├── PlotifyBackend/    # Express API (Vercel serverless)
│   └── sql/           # migrations, run in the Supabase SQL editor
└── PlotifyExtension/  # Chrome extension (popup)
```

### Frontend (`PlotifyFrontend/`)

- Landing page, screen/read shelves, add & bulk add, detail card with the seasons panel, profile, support page, and auth flows
- Cache-first data layer: TanStack Query persisted to localStorage per user, with mutations patching the cache instead of refetching
- Deployed on Vercel (`yourplotify.site`)

### Backend (`PlotifyBackend/`)

| Route | What it does |
|-------|--------------|
| `/media` | Shelf lists, stats, title lookup, add, bulk add / import matching, yearly recap, update, finish, delete, cover upload |
| `/media/:id/seasons` | Next season, add / edit / delete a season, switch the active season, rewatch |
| `/profile` | Profile edit, photo upload, account deletion |
| `/chat` | The shelf assistant (Gemini function calling over the user's own entries) |
| `/feedback` | App rating: read and upsert one row per user; counts the days a user opens the app |
| `/webhooks/clerk` | Creates the Supabase user row on sign-up, removes everything on `user.deleted` |

- Every route except webhooks requires a Clerk session; the Clerk user id is mapped to the Supabase user id once and cached
- Supabase is only accessed with the service role key from the backend; RLS is on with no public policies
- Rate limits per user (and per IP) on every route, stricter on the ones that cost money (chat, lookups, imports). Counts live in Upstash Redis when it's configured, otherwise in memory per instance
- Security headers on both apps (a CSP on the frontend in `vercel.json`); deleting an account also removes its covers and photo from storage
- Deployed on Vercel as a serverless Express app (`plotify-backend-drab.vercel.app`)

## Getting Started

### Prerequisites

- Node.js 20+ (the backend uses `node --env-file`)
- A [Supabase](https://supabase.com) project (database + a storage bucket)
- A [Clerk](https://clerk.com) application
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini) for the assistant and embeddings
- A [TMDB](https://www.themoviedb.org/settings/api) API read access token for movie & series lookup (AniList and Open Library need no key)
- [ngrok](https://ngrok.com) (for local Clerk webhook testing)

### Database

Run the files in `PlotifyBackend/sql/` once, in this order, in the Supabase SQL editor. Each one is safe to run again.

| File | Adds |
|------|------|
| `indexes.sql` | Indexes for shelves, favourites and user lookups |
| `rag.sql` | pgvector, the `embedding` column and the `match_media` search function |
| `security.sql` | Row level security on `users` and `media`; locks `match_media` to the service role |
| `features.sql` | `season` / `rewatch_count` on `media`, and the `app_feedback` table |
| `seasons.sql` | `media_seasons` (progress, status and rating per season), backfill, and the trigger that keeps the active season in sync |
| `recap.sql` | `completed_at` on `media` (backfilled, kept in sync by a trigger) for the yearly recap, and the visit-day counter behind the rating popup |

Entries added before `rag.sql` have no embedding yet. Fill them in once with `node --env-file=.env scripts/backfill-embeddings.js` from `PlotifyBackend/`.

### Backend

```bash
cd PlotifyBackend
npm install
# create a .env file with Supabase and Clerk credentials
npm run dev
```

Example backend `.env`:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
GEMINI_API_KEY=
GEMINI_CHAT_MODEL=            # chat model id for the assistant
GEMINI_EMBED_MODEL=           # optional, defaults to gemini-embedding-001
TMDB_ACCESS_TOKEN=            # TMDB API read access token (v4)
EXTENSION_ORIGINS=            # optional, chrome-extension://<id>, comma separated
UPSTASH_REDIS_REST_URL=       # optional locally, needed on vercel so rate limits are shared across instances
UPSTASH_REDIS_REST_TOKEN=
PORT=8080
```

#### Clerk webhooks & ngrok (local development)

When a user signs up, Clerk sends a webhook to your backend so a matching row is created in Supabase (`users` table). Clerk can only call **public** URLs — it cannot reach `http://localhost:8080` directly.

For local development, expose your backend with [ngrok](https://ngrok.com):

1. Install ngrok globally:
   ```bash
   npm install -g ngrok
   ```
2. Add your ngrok authtoken (from the [ngrok dashboard](https://dashboard.ngrok.com)):
   ```bash
   ngrok config add-authtoken <your-ngrok-authtoken>
   ```
3. Start the backend (`npm run dev`, default port `8080`).
4. In a second terminal, tunnel that port:
   ```bash
   ngrok http 8080
   ```
5. Copy the HTTPS forwarding URL ngrok prints (e.g. `https://abc123.ngrok-free.app`).
6. In the [Clerk Dashboard](https://dashboard.clerk.com) → **Webhooks** → **Add endpoint**:
   - **Endpoint URL:** `https://<your-ngrok-url>/webhooks/clerk`
   - **Subscribe to events:** `user.created` and `user.deleted`
7. After creating the endpoint, copy the **Signing secret** and add it to your backend `.env`:
   ```
   CLERK_WEBHOOK_SECRET=whsec_...
   ```
8. Restart the backend if it was already running.

Flow: **Clerk → ngrok → backend → Supabase**

> **Note:** Each time you restart ngrok (on the free plan), the URL changes — update the webhook endpoint URL in Clerk to match. In production, use your Vercel backend URL instead of ngrok (e.g. `https://plotify-backend-drab.vercel.app/webhooks/clerk`).

### Frontend

```bash
cd PlotifyFrontend
npm install
# create a .env file with Clerk publishable key and backend API URL
npm run dev
```

Example frontend `.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=
VITE_BACKEND_URL=http://localhost:8080
# optional: donation links on /donate (left empty, the button shows "coming soon")
VITE_SAWERIA_URL=https://saweria.co/<username>
VITE_KOFI_URL=https://ko-fi.com/<username>
# optional: chrome web store link for the extension card on the landing page ("coming soon" when empty)
VITE_EXTENSION_URL=
```

The frontend runs at `http://localhost:5173` and expects the backend at the URL in `VITE_BACKEND_URL` (default local port `8080`). `VITE_` variables are read at build time, so restart `npm run dev` (or redeploy) after changing them.

### Extension

See [`PlotifyExtension/README.md`](PlotifyExtension/README.md) for building, loading it unpacked in Chrome, and the extension id that the backend (`EXTENSION_ORIGINS`) and Clerk need to allow.

### Donations

`/donate` needs no backend setup, only the two links above:

- **Saweria**: sign up at saweria.co, complete account verification, and add a bank account or e-wallet for cash-outs. The link is `https://saweria.co/<username>`.
- **Ko-fi**: sign up at ko-fi.com and connect PayPal (Stripe isn't fully available for Indonesian accounts). One-off tips carry no Ko-fi fee unless "Standard mode" is on; PayPal's own fee still applies. The link is `https://ko-fi.com/<username>`.

## Deployment

Both apps are deployed on Vercel.

### Frontend

1. Connect the `PlotifyFrontend` directory to a Vercel project.
2. Set environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_BACKEND_URL=https://plotify-backend-drab.vercel.app`
   - `VITE_SAWERIA_URL`, `VITE_KOFI_URL` (optional, donation links; leave one out to show "coming soon")
   - `VITE_EXTENSION_URL` (optional, the Chrome Web Store listing once the extension is published)
   - `VITE_RECAP_PREVIEW=true` (optional, opens this year's recap before December, for testing)
3. The CSP in `vercel.json` names the Clerk frontend API (`clerk.yourplotify.site`) and the backend URL. Update it if either changes, or sign-in and API calls will be blocked.
4. Deploy. Custom domain: `yourplotify.site`.

### Backend

1. Connect the `PlotifyBackend` directory to a separate Vercel project.
2. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SECRET`
   - `GEMINI_API_KEY`, `GEMINI_CHAT_MODEL`, `GEMINI_EMBED_MODEL` (optional)
   - `TMDB_ACCESS_TOKEN`
   - `EXTENSION_ORIGINS` (the Chrome Web Store extension id, once published)
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (free Upstash database, or the Upstash integration in the Vercel marketplace, which sets `KV_REST_API_URL` / `KV_REST_API_TOKEN`; both names work)
3. Run any new files in `sql/` in Supabase **before** deploying code that depends on them.
4. Deploy. Production API: `https://plotify-backend-drab.vercel.app`.
5. In the Clerk Dashboard, point the webhook endpoint to:
   `https://plotify-backend-drab.vercel.app/webhooks/clerk` with `user.created` and `user.deleted`
6. In the backend Vercel project, keep **Deployment Protection / Vercel Authentication** off for Production so the frontend can call the API freely.

Health check: `GET /` should return `{ "ok": true, "service": "plotify-backend" }`.

## License

Personal project — all rights reserved.
