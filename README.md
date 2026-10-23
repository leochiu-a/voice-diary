# Voice Diary

A private diary for your journey. Write each entry as text, record voice notes, or do both. Every voice note is stored in Cloudflare R2 and transcribed to text automatically.

- **Next.js 16** (App Router, Server Actions, `proxy.ts`)
- **Supabase**: Google sign-in plus Postgres, with row-level security so each user sees only their own entries
- **Cloudflare R2**: audio files, uploaded straight from the browser through presigned URLs
- **OpenAI `gpt-4o-transcribe`**: speech-to-text

## How a voice note is saved

1. The browser records with `MediaRecorder` (WebM/Opus on Chrome and Firefox, MP4/AAC on Safari).
2. `createRecordingUpload` checks that you own the entry and returns a presigned PUT URL that lasts 5 minutes.
3. The browser uploads the audio straight to R2.
4. `saveRecording` checks the object's size (25 MB max), inserts a `recordings` row, downloads the audio, transcribes it and stores the transcript.
5. If transcription fails, the recording is kept and the entry page shows a **Retry transcription** button.

## Environments

Only the database is separate between local development and production. R2 and OpenAI are shared:

| Service               | Local development                     | Production                                     |
| --------------------- | ------------------------------------- | ---------------------------------------------- |
| Supabase              | Supabase in Docker (`supabase start`) | Hosted project on supabase.com                 |
| Cloudflare R2         | The `voice-diary` bucket              | Same bucket                                    |
| OpenAI                | One API key                           | Same key                                       |
| Where the values live | `.env.local` on your machine          | The host's environment variables (e.g. Vercel) |

- `.env.local` is for local development only. Git ignores it, along with every `.env*` file except `.env.example`.
- Production values are never kept in a file in this repository. Enter them in the host's settings.
- Local and production recordings don't mix in the shared bucket: object keys start with the user's id (`<user-id>/<entry-id>/...`), and the local and hosted databases give the same Google account different ids.
- `supabase db reset` wipes the local database but not R2. The recordings it leaves behind stay under the old local user's id; delete that folder in the R2 dashboard if you want the space back.

## Local development

Requires Docker, the [Supabase CLI](https://supabase.com/docs/guides/cli) and pnpm.

### 1. Supabase in Docker

```bash
supabase start            # starts Postgres, Auth and Studio; applies supabase/migrations
supabase status           # shows the API URL and publishable key for .env.local
```

- Google sign-in needs an OAuth client (see **Google sign-in** below). Put its ID and secret in `supabase/.env`, using `supabase/.env.example` as the template, then restart with `supabase stop && supabase start`.
- Studio (a database GUI) runs at http://127.0.0.1:54323.
- To apply a new migration and keep local data, run `supabase migration up --local`. To rebuild from scratch, run `supabase db reset`. This wipes local data.
- Analytics is disabled in `supabase/config.toml` because its container runs out of memory on Docker Desktop's default limits.

### 2. Cloudflare R2 and OpenAI

Set up once, shared with production: see **Cloudflare R2** and **OpenAI** below.

### 3. `.env.local`

```bash
cp .env.example .env.local
```

Fill it in: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `supabase status`, plus the R2 and OpenAI values (the same ones production uses). Then run:

```bash
pnpm install
pnpm dev
```

Linting and formatting use the Oxc toolchain: `pnpm lint` runs oxlint (`.oxlintrc.json`), `pnpm fmt` formats with oxfmt (`.oxfmtrc.json`, which also sorts Tailwind classes) and `pnpm fmt:check` reports unformatted files. Unit tests use Vitest with React Testing Library, next to the code they cover (`*.test.ts[x]`): `pnpm test` watches, `pnpm test --run` runs once.

The dev server runs at **https://localhost:3443**. `--experimental-https` creates a locally trusted certificate with mkcert, saved in `certificates/` (git ignores it). The first run may ask for your macOS password to trust mkcert's root certificate.

## Cloudflare R2

One private bucket serves both local development and production. In the Cloudflare dashboard, open **R2 Object Storage**:

1. **Create bucket** named `voice-diary`. Keep it private (no public access).
2. On the R2 **Overview** page, under **Account Details**, select **Manage** next to **API Tokens**. Create an **Account API token** with permission **Object Read & Write**, scoped to the `voice-diary` bucket. Copy the **Access Key ID** and **Secret Access Key** right away; the secret is shown only once. The **Account ID** is also under **Account Details**, and it is the subdomain of the S3 endpoint shown with the token (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
3. In the bucket's **Settings → CORS policy**, allow the local dev server and your production domain:

```json
[
  {
    "AllowedOrigins": ["https://localhost:3443", "https://your-domain.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

## OpenAI

Create an API key at [OpenAI → API keys](https://platform.openai.com/api-keys). It is used for speech-to-text, by both local development and production.

## Google sign-in

1. In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials), configure the OAuth consent screen, then create an **OAuth client ID** of type **Web application**.
2. Under **Authorized redirect URIs**, add Supabase's callback, not the app's:
   - local: `http://127.0.0.1:54321/auth/v1/callback`
   - hosted: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Local: copy the client ID and secret into `supabase/.env`. Hosted: paste them into Supabase → Authentication → Sign In / Providers → Google.

The flow: **Continue with Google** → Supabase → Google → Supabase → `/auth/callback` in this app, which exchanges the one-time code for a session cookie.

## Production (Cloudflare Workers)

The app runs on Cloudflare Workers through the [OpenNext adapter](https://opennext.js.org/cloudflare) (`wrangler.jsonc`, `open-next.config.ts`).

- **Workers Paid plan required.** The free plan allows 10 ms of CPU time per request, and server-rendering a page with Next.js needs more. (Bundle size is not a problem: the Worker is about 10 MB, well under the 64 MiB limit.)
- `proxy.ts` runs on the Node.js runtime, which OpenNext supports on Cloudflare only experimentally. It works, but check the session redirect after upgrading Next.js or OpenNext.

### Try it locally first

```bash
cp .env.local .dev.vars   # the Worker reads its variables from .dev.vars
pnpm preview              # builds for Workers and serves http://localhost:8787
```

Local Supabase already accepts `http://localhost:8787` as a sign-in redirect. To upload voice notes from the preview, also add `http://localhost:8787` to the R2 bucket's CORS origins.

### 1. Deploy the Worker

```bash
pnpm exec wrangler login
pnpm run deploy
```

The first deploy prints the Worker's URL, e.g. `https://voice-diary.<your-subdomain>.workers.dev`. The next steps use it as the app's URL.

### 2. Supabase

1. Create a project at supabase.com.
2. Open the SQL editor and run each file in `supabase/migrations/` in order. When a new migration is added later, run just that file.
3. Add the emails allowed to sign up: `insert into public.allowed_emails (email) values ('you@gmail.com');`
4. Under **Authentication → Hooks**, add a **Before User Created** hook of type **Postgres**, using the function `public.restrict_signups`. Sign-ups from any other email are then rejected before an account is created.
5. Under **Authentication → URL Configuration**, set the Site URL to the app's URL, and add `<app URL>/**` to **Redirect URLs**.
6. Enable Google under **Authentication → Sign In / Providers** (see **Google sign-in**). The app only uses Google, so leave the email provider's sign-up off.

### 3. Secrets

Set every variable from `.env.example` on the Worker, with production values. The hosted Supabase URL and publishable key are under **Project Settings → API Keys**; `ALLOWED_EMAILS` should list the same emails as `public.allowed_emails`.

```bash
pnpm exec wrangler secret put SUPABASE_URL
# ...and the same for SUPABASE_PUBLISHABLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
# R2_SECRET_ACCESS_KEY, R2_BUCKET, OPENAI_API_KEY and ALLOWED_EMAILS
```

Each `secret put` rolls out a new version of the Worker, so no redeploy is needed.

### 4. R2

Add the app's URL to the bucket's CORS origins (see **Cloudflare R2**), so browsers can upload voice notes to it.
