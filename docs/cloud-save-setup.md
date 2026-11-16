# Cloud save (Google sign-in) — setup

The code is in the game but switched off. It turns itself on only when all three settings below exist on the Nooklings Pages project. Until then the game shows nothing about cloud save and works exactly as before.

What is stored: one save per player, keyed by Google's anonymous account number. No email, no name.

## What you need to do (about 10 minutes)

### 1. Google: create a sign-in client ID
1. Open the Google Cloud Console, **APIs & Services → Credentials** (create a project called "Nooklings" if asked).
2. If asked to set up the consent screen / branding first: app name "Nooklings", your own email as support and developer contact, audience **External**, and add yourself as a test user.
3. **Create credentials / Create client → OAuth client ID**, application type **Web application**, name "Nooklings web".
4. Under **Authorized JavaScript origins** add exactly: `https://nooklings.pages.dev`
5. Leave redirect URIs empty. Create, then copy the **Client ID** (it ends in `.apps.googleusercontent.com`). The client secret is not needed.

### 2. Cloudflare: create the storage
1. Cloudflare dashboard → **Storage & Databases → KV → Create** (namespace). Name it `nooklings-saves`.

This is a new, separate store. It does not touch the other workers or ouruchi.app.

### 3. Cloudflare: connect both to the Nooklings project
1. **Workers & Pages → nooklings → Settings**, environment **Production**.
2. **Bindings → Add → KV namespace**: variable name `SAVES`, namespace `nooklings-saves`.
3. **Variables and Secrets → Add**:
   - `GOOGLE_CLIENT_ID` (plain text) = the Client ID from step 1.
   - `SESSION_SECRET` (type **Secret**) = any long random text, 40 characters or more (for example from a password manager). Do not share it or put it anywhere else.
4. **Deployments → latest production deployment → Retry deployment**, so the settings take effect.

### 4. Check
Open https://nooklings.pages.dev → **Tasks** → scroll to the bottom. A **Cloud save** card with a "Sign in with Google" button should be there. Sign in; it should say "Saved to the cloud".

If the card does not appear: one of the three names is misspelt (`SAVES`, `GOOGLE_CLIENT_ID`, `SESSION_SECRET`), the secret is shorter than 16 characters, or the deployment was not retried.

## How it behaves
- The game still plays from the browser save. Changes go up a few seconds later, and when the page is closed.
- Opening the game on another device and signing in brings the cloud save down. A brand-new game takes it without asking.
- If both devices have different progress, the game asks which to keep. It never merges and never overwrites silently.
- "Sign out" stops syncing on that device; both saves stay as they are.
- A sign-in lasts 60 days.

## For developers
- Server: `server/auth.ts`, `server/api.ts`; routes in `functions/api/` (`config`, `login`, `save`). Tests in `server/test`.
- Client: `apps/client/src/save/cloud.ts` (sync rules, tests in `apps/client/test`), `cloudCard.ts` (the Tasks-page card).
- The Pages project must build from the repo root so that `functions/` is picked up.
