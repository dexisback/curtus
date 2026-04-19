"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

const ERROR_MESSAGES: Record<string, string> = {
  oauth: "OAuth sign-in failed. Please try again.",
  "account-not-linked":
    "An account with this email already exists. Sign in with your original provider.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const errorKey = searchParams.get("error") ?? "";
  const errorMessage = ERROR_MESSAGES[errorKey] ?? null;

  function handleGoogle() {
    signIn.social({
      provider: "google",
      callbackURL: next,
      errorCallbackURL: `/login?error=oauth&next=${encodeURIComponent(next)}`,
    });
  }

  function handleGitHub() {
    signIn.social({
      provider: "github",
      callbackURL: next,
      errorCallbackURL: `/login?error=oauth&next=${encodeURIComponent(next)}`,
    });
  }

  return (
    <div>
      <h1>Sign in to StudyWithMe</h1>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button type="button" onClick={handleGoogle}>
        Continue with Google
      </button>

      <button type="button" onClick={handleGitHub}>
        Continue with GitHub
      </button>
    </div>
  );
}
