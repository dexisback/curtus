import { createHmac } from "node:crypto";

function b64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function verifySocketAuthToken(token: string, secret: string): string | null {
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return null;

  const expectedSig = createHmac("sha256", secret).update(payloadPart).digest("base64url");
  if (expectedSig !== sigPart) return null;

  try {
    const parsed = JSON.parse(b64urlDecode(payloadPart)) as { uid?: string; exp?: number };
    if (!parsed.uid || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

// — socket-auth-token.ts: Verify HMAC socket token (shared secret with Next app).

