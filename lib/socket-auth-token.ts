import { createHmac } from "node:crypto";

const DEFAULT_TTL_SECONDS = 60 * 10;

function b64urlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function b64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function signSocketAuthToken(userId: string, secret: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const payload = JSON.stringify({
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
  const payloadPart = b64urlEncode(payload);
  const sigPart = createHmac("sha256", secret).update(payloadPart).digest("base64url");
  return `${payloadPart}.${sigPart}`;
}

export function verifySocketAuthToken(token: string, secret: string): string | null {
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return null;

  const expectedSig = createHmac("sha256", secret).update(payloadPart).digest("base64url");
  if (sigPart !== expectedSig) return null;

  try {
    const parsed = JSON.parse(b64urlDecode(payloadPart)) as { uid?: string; exp?: number };
    if (!parsed.uid || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}
