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

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios |
| **Backend** | Node.js, Express 5 |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage (media thumbnails & profile images) |
| **Auth** | Clerk |
| **Deployment** | Frontend → [Vercel](https://vercel.com) · Backend → [Railway](https://railway.app) |

## Project Structure

```
Plotify/
├── PlotifyFrontend/   # React + Vite app
└── PlotifyBackend/    # Express API server
```

### Frontend (`PlotifyFrontend/`)

- Pages for home, screen/read shelves, add/edit cards, profile, and auth flows
- Clerk React SDK for authentication
- TanStack Query for data fetching and caching
- Deployed on Vercel

### Backend (`PlotifyBackend/`)

- REST API for media and profile management
- Clerk middleware for protected routes
- Supabase client for database and file storage
- Clerk webhooks to sync user data on sign-up
- Deployed on Railway

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

> **Note:** Each time you restart ngrok (on the free plan), the URL changes — update the webhook endpoint URL in Clerk to match. In production on Railway, use your Railway backend URL instead of ngrok (e.g. `https://your-app.up.railway.app/webhooks/clerk`).

### Frontend

```bash
cd PlotifyFrontend
npm install
# create a .env file with Clerk publishable key and backend API URL
npm run dev
```

The frontend runs at `http://localhost:5173` and expects the backend at the port configured in your environment (default `8080`).

## Deployment

- **Frontend** — Connect the `PlotifyFrontend` directory to Vercel. Set Clerk publishable key and backend API URL in environment variables.
- **Backend** — Deploy `PlotifyBackend` on Railway. Set Supabase credentials, Clerk secret key, and `CLERK_WEBHOOK_SECRET` in Railway env vars. Point the Clerk webhook endpoint to your Railway URL: `https://<your-railway-app>/webhooks/clerk`.

## License

Personal project — all rights reserved.
