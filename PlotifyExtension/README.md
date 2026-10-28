# Plotify Extension

A Chrome popup for logging progress without leaving the tab. Open it on the page you're watching or reading and it:

- **finds the title in your list** by the site you're on or by the page title, then lets you do **+1 / −1**, type a number, or jump to the episode/chapter it read from the page
- shows the **active season** (or volume) and its rewatch count, and **finishes that season** with its own 1–5 rating. The title only moves to finished when no other season is still running; "mark as ongoing" brings it back
- moves on to the **next season**: rates the one you're leaving, then keeps counting (30 → 31) or starts from 0. If the next season is already on the list, it picks up where you left it
- **lets you pick any title from your list** instead (screen / read tabs with search) when the guess is wrong
- **adds a new title** when it isn't in your list yet: the title is read from the page (selected text, site-specific selectors, JSON-LD, `og:title`, `<h1>`, tab title), cleaned up, and offered as options. The top TMDB / AniList / Open Library match from the backend `/media/lookup` fills in the cover, description and categories, and every field stays editable before saving. A starting season can be set too

Switching between seasons, rewatching, deleting a season, bulk add and cropping covers live on the website; "open in plotify" jumps straight to the title's card.

The page is only read when the popup is opened (`activeTab` + `scripting`), never in the background. Sign-in is shared with the Plotify website through Clerk's `syncHost`, so users sign in once on the site.

## Setup

```bash
cp .env.example .env   # fill in the values
npm install
npm run build          # output in dist/
```

Load it in Chrome: `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → pick `dist/`. Use `npm run dev` to rebuild on save, then press reload on the extension card.

With `EXTENSION_KEY` set, the extension id stays the same on every machine. Two places need that id:

1. **Backend:** `EXTENSION_ORIGINS=chrome-extension://<id>` in `PlotifyBackend/.env` (and in Vercel for production)
2. **Clerk:** add it to the instance's allowed origins, once for the development instance and once for production:

   ```bash
   curl -X PATCH https://api.clerk.com/v1/instance \
     -H "Authorization: Bearer <CLERK_SECRET_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"allowed_origins": ["chrome-extension://<id>"]}'
   ```

## Publishing to the Chrome Web Store

1. Set the production values in `.env`: a `pk_live_` key, the production backend URL, `VITE_PLOTIFY_URL=https://yourplotify.site`, and an **empty** `EXTENSION_KEY` (the store rejects the `key` field).
2. `npm run zip` → upload `plotify-extension.zip` in the [developer dashboard](https://chrome.google.com/webstore/devconsole).
3. The store assigns the real extension id. Add `chrome-extension://<store id>` to `EXTENSION_ORIGINS` and to Clerk's production allowed origins.
4. Set `VITE_EXTENSION_URL` to the store listing in the frontend's Vercel project and redeploy, so the landing page shows "add to chrome" instead of "coming soon".
5. Bump `version` in `package.json` for every new upload.

## Adding a site

Title selectors for specific sites live in `SITE_SELECTORS` in [src/lib/page.ts](src/lib/page.ts). Sites that tell the popup whether something is watched or read live in `READ_HOST_RE` / `SCREEN_HOST_RE` in [src/lib/match.ts](src/lib/match.ts).
