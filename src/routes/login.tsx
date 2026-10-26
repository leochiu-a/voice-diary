import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { ComponentProps } from "react";
import { CalendarDaysIcon, LockIcon, MicIcon, type LucideIcon } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { AppIconArt } from "@/lib/app-icon";
import { signInWithGoogle } from "@/server/auth";

// ?error= says why the last sign-in didn't go through.
export const Route = createFileRoute("/login")({
  validateSearch: (search): { error?: string } =>
    typeof search.error === "string" ? { error: search.error } : {},
  head: () => ({ meta: [{ title: "Sign in · Voice Diary" }] }),
  component: LoginPage,
});

const FEATURES: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: MicIcon, title: "Speak or type", detail: "Recordings are transcribed into the entry." },
  { icon: CalendarDaysIcon, title: "Every day in view", detail: "Browse by month, day or tag." },
  { icon: LockIcon, title: "Yours alone", detail: "Only your account can read it." },
];

// Fades each part in from slightly below, one after another.
const enter =
  "motion-safe:animate-in motion-safe:fill-mode-backwards motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500";

function LoginPage() {
  const { error } = Route.useSearch();
  // Follows the redirect to Google the server function answers with.
  const signIn = useServerFn(signInWithGoogle);
  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden px-6 pt-16 pb-[max(env(safe-area-inset-bottom),2rem)]">
      {/* The Insights card's colors as a soft glow behind the icon. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh] bg-[radial-gradient(55%_45%_at_50%_22%,color-mix(in_oklab,var(--insights-from)_40%,transparent),transparent)]"
      />
      {/* On a phone the button sits at the bottom, under the thumb; on a wider
          screen everything is one centered group. */}
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col sm:my-auto sm:flex-none">
        <div className="flex flex-1 flex-col items-center justify-center text-center sm:flex-none">
          <AppIconArt
            size={88}
            style={{ borderRadius: 20 }}
            className={`shadow-[0_16px_40px_-12px_var(--insights-from)] ${enter}`}
          />
          <h1
            className={`mt-6 text-[34px] leading-tight font-bold tracking-tight ${enter} motion-safe:delay-75`}
          >
            Voice Diary
          </h1>
          <p
            className={`mt-2 text-[17px] text-balance text-muted-foreground ${enter} motion-safe:delay-150`}
          >
            Write or speak the day&apos;s journey.
          </p>
          <ul
            className={`mt-10 flex w-full flex-col gap-5 text-left ${enter} motion-safe:delay-225`}
          >
            {FEATURES.map(({ icon: Icon, title, detail }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{title}</span>
                  <span className="text-sm text-muted-foreground">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={`mt-10 ${enter} motion-safe:delay-300`}>
          <form action={() => signIn()}>
            <SubmitButton
              className="h-12 w-full gap-2.5 rounded-full bg-foreground text-base font-semibold text-background hover:bg-foreground/90"
              pendingLabel="Redirecting to Google…"
            >
              <GoogleIcon data-icon="inline-start" className="size-5" />
              Continue with Google
            </SubmitButton>
          </form>
          {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </main>
  );
}

function GoogleIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...props}>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"
      />
    </svg>
  );
}
