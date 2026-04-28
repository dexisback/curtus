import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { redis } from "./redis";

const isProd = process.env.NODE_ENV === "production";
const hasGoogleAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const hasGitHubAuth = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
);

const trustedOrigins: string[] = [
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
];

if (process.env.NEXT_PUBLIC_APP_URL) {
  trustedOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
}

if (isProd) {
  trustedOrigins.push("https://*.vercel.app");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins,

  ...(redis
    ? ((_r) => ({
        secondaryStorage: {
          get: async (key: string) => {
            const val = await _r.get<string>(key);
            return val ?? null;
          },
          set: async (key: string, value: string, ttl?: number) => {
            if (ttl) {
              await _r.set(key, value, { ex: ttl });
            } else {
              await _r.set(key, value);
            }
          },
          delete: async (key: string) => {
            await _r.del(key);
          },
        },
      }))(redis)
    : {}),

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
      trustedProviders: [
        ...(hasGoogleAuth ? (["google"] as const) : []),
        ...(hasGitHubAuth ? (["github"] as const) : []),
      ],
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
