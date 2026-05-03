import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { redis } from "./redis";
import { buildTrustedAuthOrigins, effectiveBetterAuthUrl } from "./auth-urls";

const isProd = process.env.NODE_ENV === "production";
const hasGoogleAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const hasGitHubAuth = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
);

const trustedOrigins = buildTrustedAuthOrigins();

function betterAuthSecondaryStorage(r: NonNullable<typeof redis>) {
  return {
    secondaryStorage: {
      get: async (key: string) => {
        const val = await r.get<string>(key);
        return val ?? null;
      },
      set: async (key: string, value: string, ttl?: number) => {
        if (ttl) await r.set(key, value, { ex: ttl });
        else await r.set(key, value);
      },
      delete: async (key: string) => {
        await r.del(key);
      },
    },
  };
}

const trustedProviders: ("google" | "github")[] = [];
if (hasGoogleAuth) trustedProviders.push("google");
if (hasGitHubAuth) trustedProviders.push("github");

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: effectiveBetterAuthUrl(),
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins,

  ...(redis ? betterAuthSecondaryStorage(redis) : {}),

  verification: {
    storeInDatabase: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  rateLimit: {
    enabled: isProd,
    window: 60,
    max: 100,
    storage: redis ? "secondary-storage" : "memory",
    customRules: {
      "/sign-in/social": { window: 60, max: 5 },
      "/sign-out": { window: 60, max: 10 },
      "/callback/*": { window: 60, max: 10 },
      "/get-session": { window: 60, max: 60 },
      "/delete-user": { window: 600, max: 3 },
    },
  },

  socialProviders: {
    ...(hasGoogleAuth
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {}),
    ...(hasGitHubAuth
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          },
        }
      : {}),
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders,
    },
  },

  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      bio: {
        type: "string",
        required: false,
        input: false,
      },
      lifetimeFocusMinutes: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
  },

  advanced: {
    useSecureCookies: isProd,
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "cf-connecting-ip"],
    },
  },

  plugins: [nextCookies()],
});

// — auth.ts: Better Auth server config (Prisma, Redis cache, OAuth, sessions, rate limits). Builds providers and origins from env.
