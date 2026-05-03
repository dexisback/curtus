"use client";

import { createAuthClient } from "better-auth/react";

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "");

export const authClient = createAuthClient({
  baseURL,
});

export const { useSession, signIn, signOut } = authClient;

// — auth-client.ts: Better Auth React client bound to browser origin or NEXT_PUBLIC_APP_URL.

