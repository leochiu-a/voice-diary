import { Suspense, type ComponentProps } from "react";
import { SubmitButton } from "@/components/submit-button";
import { signInWithGoogle } from "./actions";

export const metadata = { title: "Sign in · Voice Diary" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-[34px] leading-tight font-bold tracking-tight">Voice Diary</h1>
      <p className="mt-2 text-sm text-muted-foreground">Write or speak the day&apos;s journey.</p>
      <form action={signInWithGoogle} className="mt-8">
        <SubmitButton
          variant="outline"
          size="lg"
          className="w-full"
          pendingLabel="Redirecting to Google…"
        >
          <GoogleIcon data-icon="inline-start" />
          Continue with Google
        </SubmitButton>
      </form>
      <Suspense>
        <SignInError searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SignInError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;
  return <p className="mt-4 text-sm text-destructive">{error}</p>;
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
