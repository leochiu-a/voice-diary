# Development

Requires Docker, the [Supabase CLI](https://supabase.com/docs/guides/cli) and pnpm.

## 1. Supabase in Docker

```bash
supabase start            # starts Postgres, Auth and Studio; applies supabase/migrations
supabase status           # shows the API URL and publishable key for .env.local
```

- Google sign-in needs an OAuth client (see [Google sign-in](self-hosting.md#google-sign-in)). Put its ID and secret in `supabase/.env`, using `supabase/.env.example` as the template, then restart with `supabase stop && supabase start`.
- Sign-ups are limited to listed emails here too (see [Who can sign in](self-hosting.md#who-can-sign-in)). Add yours in Studio's SQL editor, or the first Google sign-in is rejected with "This diary is private.":

  ```sql
  insert into public.allowed_emails (email) values ('you@gmail.com');
  ```

- Studio (a database GUI) runs at http://127.0.0.1:54323.
- To fill the local diary with invented entries (for demos and screenshots), sign in once, then run `SUPABASE_SECRET_KEY=<secret key from supabase status> pnpm seed --email you@gmail.com --apply`. Add `--voice 2` to read the two most recent entries aloud with OpenAI text-to-speech and attach them as voice notes, uploaded to R2. It replaces every entry of that account, audio included, and refuses to run against anything but the local database.
- To apply a new migration and keep local data, run `supabase migration up --local`. To rebuild from scratch, run `supabase db reset`. This wipes local data.
- Analytics is disabled in `supabase/config.toml` because its container runs out of memory on Docker Desktop's default limits.

## 2. Cloudflare R2 and OpenAI

Set up once, shared with production: see [Cloudflare R2](self-hosting.md#cloudflare-r2) and [OpenAI](self-hosting.md#openai).

## 3. `.env.local`

```bash
cp .env.example .env.local
```

Fill it in: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `supabase status`, the R2 and OpenAI values (the same ones production uses), and `ALLOWED_EMAILS` with the same emails as the local `allowed_emails` table. Then run:

```bash
pnpm install
pnpm dev
```

Linting and formatting use the Oxc toolchain: `pnpm lint` runs oxlint (`.oxlintrc.json`), `pnpm fmt` formats with oxfmt (`.oxfmtrc.json`, which also sorts Tailwind classes) and `pnpm fmt:check` reports unformatted files. Unit tests use Vitest with React Testing Library, next to the code they cover (`*.test.ts[x]`): `pnpm test` watches, `pnpm test --run` runs once.

The dev server runs at **https://localhost:3443**. `vite-plugin-mkcert` creates a locally trusted certificate with mkcert (microphone access needs HTTPS). The first run may ask for your macOS password to trust mkcert's root certificate. The dev server runs the server code in workerd, the Workers runtime, which reads `.env.local` too. `pnpm dev` and `pnpm build` first draw the icons and launch images into `public/` (`scripts/app-images.tsx`). `pnpm build` writes the Worker to `dist/`, and `pnpm preview` runs that build locally.

## Environments

Only the database is separate between local development and production. R2 and OpenAI are shared:

| Service               | Local development                     | Production                     |
| --------------------- | ------------------------------------- | ------------------------------ |
| Supabase              | Supabase in Docker (`supabase start`) | Hosted project on supabase.com |
| Cloudflare R2         | The `voice-diary` bucket              | Same bucket                    |
| OpenAI                | One API key                           | Same key                       |
| Where the values live | `.env.local` on your machine          | The Worker's secrets           |

- `.env.local` is for local development only. Git ignores it, along with every `.env*` file except `.env.example`.
- Production values are never kept in a file in this repository. Enter them in the host's settings.
- Local and production recordings don't mix in the shared bucket: object keys start with the user's id (`<user-id>/<entry-id>/...`), and the local and hosted databases give the same Google account different ids.
- `supabase db reset` wipes the local database but not R2. The recordings it leaves behind stay under the old local user's id; delete that folder in the R2 dashboard if you want the space back.

## How a voice note is saved

1. The browser records with `MediaRecorder` (WebM/Opus on Chrome and Firefox, MP4/AAC on Safari). When recording stops, the voice note shows up right away, playing from the local audio; the steps below run in the background.
2. `createRecordingUpload` checks that you own the entry and returns a presigned PUT URL that lasts 5 minutes.
3. The browser uploads the audio straight to R2.
4. `saveRecording` checks the object's size (25 MB max) and inserts a `recordings` row.
5. `transcribeRecording` downloads the audio, transcribes it, stores the transcript and adds the text to the end of the entry. The editor shows the transcript in the voice note and adds the text to the body in the same render.
6. If transcription fails, the recording is kept and its menu offers **Add Text to Entry** to try again.
