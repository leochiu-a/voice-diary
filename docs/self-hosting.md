# Self-hosting

Everything Voice Diary needs runs on your own accounts: a Cloudflare Worker for the app, a Supabase project for sign-in and entries, an R2 bucket for audio, and an OpenAI API key for transcription.

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
4. A new consent screen is in **Testing**, where Google only lets listed accounts sign in. Under **Audience → Test users**, add every Google account that will use the diary, locally or in production.

The flow: **Continue with Google** → Supabase → Google → Supabase → `/auth/callback` in this app, which exchanges the one-time code for a session cookie.

## Who can sign in

The diary is private; three lists decide who gets in, and each must include your Google account:

| List                                  | What it does                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Google OAuth **Test users**           | Google refuses other accounts while the consent screen is in Testing                               |
| `public.allowed_emails` table         | The **Before User Created** hook (`public.restrict_signups`) rejects sign-ups from any other email |
| `ALLOWED_EMAILS` environment variable | The app signs out any account that is not listed, even one that already exists                     |

The table and the variable are kept per environment (local and production), so a personal email never lands in this repository.

## Production (Cloudflare Workers)

The app runs as a Cloudflare Worker, configured in `wrangler.jsonc`: the Worker serves the pages and server functions, and the built files in `dist/client` (scripts, styles, icons, launch images) are served as static assets without reaching it. The Worker is placed in Tokyo (`aws:ap-northeast-1`), next to the hosted Supabase project, since a page makes several database calls one after another.

### 1. Supabase

1. Create a project at supabase.com, in Tokyo (or change the Worker's `placement` to match).
2. Apply the migrations from this repository:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

3. Add the emails allowed to sign up: `insert into public.allowed_emails (email) values ('you@gmail.com');`
4. Under **Authentication → Hooks**, add a **Before User Created** hook of type **Postgres**, using the function `public.restrict_signups`. Sign-ups from any other email are then rejected before an account is created.
5. Enable Google under **Authentication → Sign In / Providers** (see [Google sign-in](#google-sign-in)). The app only uses Google, so leave the email provider's sign-up off.

### 2. The Worker

Sign in once with `pnpm dlx wrangler login`. Store every variable from `.env.example` as a Worker secret, with production values, one at a time (each command asks for the value):

```bash
pnpm dlx wrangler secret put SUPABASE_URL
```

The hosted Supabase URL and publishable key are under **Project Settings → API Keys** in Supabase; `ALLOWED_EMAILS` should list the same emails as `public.allowed_emails`. Then deploy:

```bash
pnpm run deploy
```

Each deploy builds the app and uploads it. Secrets stay with the Worker between deploys.

### 3. The app's URL

Once the first deploy gives the app its URL (e.g. `https://voice-diary.<your-subdomain>.workers.dev`):

1. In Supabase, under **Authentication → URL Configuration**, set the Site URL to it and add `<app URL>/**` to **Redirect URLs**.
2. Add it to the R2 bucket's CORS origins (see [Cloudflare R2](#cloudflare-r2)), so browsers can upload voice notes.

### On a phone

The app ships a web app manifest, so it can live on the home screen and open full screen, without the browser's address bar. On iPhone, open the app's URL in Safari (or Chrome), choose **Share → Add to Home Screen**, and keep **Open as Web App** on. The home screen app keeps its own cookies, so sign in once more inside it. iOS saves the launch image (the icon shown while the app opens) at the moment you add it, for the light or dark mode the phone is in then, so let the page finish loading for a few seconds before tapping **Add**, and add it again if you later want the other mode's image.

## Importing from Journey

`scripts/import-journey.mts` copies entries from a [Journey](https://journey.cloud) export: each entry's text, date and tags. Photos, voice notes, places, weather and moods are left out.

1. Export from the Journey app (Mac or iPhone): **Settings → Data & Cloud Services →** your sync service **→ Export/Backup**, and unzip it. Journey on the web can't export entries synced with Google Drive.
2. Sign in to the diary once with the account to import into, so it exists.
3. Check what would be imported. This writes nothing:

   ```bash
   pnpm import:journey <folder of .json files, or one merged .json> --email you@gmail.com
   ```

4. Import, with the target project's URL and secret key (locally, both from `supabase status`; hosted, under **Project Settings → API Keys**):

   ```bash
   SUPABASE_URL=… SUPABASE_SECRET_KEY=… pnpm import:journey <export> --email you@gmail.com --apply
   ```

The key only opens a session for that account; the entries are written as that user, through row-level security. Rich text becomes plain text with blank lines between paragraphs, and each entry is dated in the time zone it was written in. Every Journey entry maps to the same diary entry, so running the import again skips what is already there.
