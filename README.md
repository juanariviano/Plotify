# Plotify

A personal media journal for tracking where you left off across everything you watch and read.

## The Problem

I love watching shows and reading books, manga, and long-form content — often from many different sources at once. Streaming sites, reading apps, browser tabs, notes apps… the content is everywhere, but my progress is not.

The question that kept coming up: **where do I store the last episode I watched or the last page I read?** Notes get lost, bookmarks pile up, and I forget where I stopped. Plotify is my answer — one quiet place to log progress and pick up exactly where I left off.

## Features

- **Screen shelf** — Track shows and series. Log the last episode you finished, add a cover, source link, and categories.
- **Read shelf** — Same flow for books, manga, and other reads. Track your last page or chapter in one card.
- **Add & edit entries** — Create new items with title, description, thumbnail, source, and progress. Update anytime from a detail view.
- **Search** — Quickly find anything in your watch or read list.
- **Mark as complete** — Move finished items to a completed section and rate them out of 5.
- **User profiles** — Edit your profile, upload a profile picture, change password, or delete your account.
- **Authentication** — Sign up, sign in, forgot/reset password, and SSO via Clerk.

## Live

| Surface | URL |
|---------|-----|
| **Frontend** | [https://yourplotify.site](https://yourplotify.site) |
| **Backend API** | [https://plotify-backend-drab.vercel.app](https://plotify-backend-drab.vercel.app) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios |
| **Backend** | Node.js, Express 5 (serverless on Vercel) |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage (media thumbnails & profile images) |
| **Auth** | Clerk |
| **Deployment** | Frontend → [Vercel](https://vercel.com) · Backend → [Vercel](https://vercel.com) |

## Project Structure

```
Plotify/
├── PlotifyFrontend/   # React + Vite app
└── PlotifyBackend/    # Express API (Vercel serverless)
```

### Frontend (`PlotifyFrontend/`)

- Pages for home, screen/read shelves, add/edit cards, profile, and auth flows
- Clerk React SDK for authentication
- TanStack Query for data fetching and caching
- Deployed on Vercel (`yourplotify.site`)

### Backend (`PlotifyBackend/`)

- REST API for media and profile management
- Clerk middleware for protected routes
- Supabase client for database and file storage
- Clerk webhooks to sync user data on sign-up
- Deployed on Vercel as a serverless Express app (`plotify-backend-drab.vercel.app`)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (database + storage bucket)
- A [Clerk](https://clerk.com) application
- [ngrok](https://ngrok.com) (for local Clerk webhook testing)

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
   - **Subscribe to events:** `user.created` (or equivalent sign-up event)
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
```

The frontend runs at `http://localhost:5173` and expects the backend at the URL in `VITE_BACKEND_URL` (default local port `8080`).

## Deployment

Both apps are deployed on Vercel.

### Frontend

1. Connect the `PlotifyFrontend` directory to a Vercel project.
2. Set environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_BACKEND_URL=https://plotify-backend-drab.vercel.app`
3. Deploy. Custom domain: `yourplotify.site`.

### Backend

1. Connect the `PlotifyBackend` directory to a separate Vercel project.
2. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SECRET`
3. Deploy. Production API: `https://plotify-backend-drab.vercel.app`.
4. In the Clerk Dashboard, point the webhook endpoint to:
   `https://plotify-backend-drab.vercel.app/webhooks/clerk`
5. In the backend Vercel project, keep **Deployment Protection / Vercel Authentication** off for Production so the frontend can call the API freely.

Health check: `GET /` should return `{ "ok": true, "service": "plotify-backend" }`.

## License

Personal project — all rights reserved.
