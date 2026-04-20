import { Receiver } from "@upstash/qstash";

let receiver: Receiver | null = null;

function getReceiver(): Receiver {
  if (!receiver) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (!currentSigningKey || !nextSigningKey) {
      throw new Error("Missing QSTASH_CURRENT_SIGNING_KEY or QSTASH_NEXT_SIGNING_KEY");
    }

    receiver = new Receiver({ currentSigningKey, nextSigningKey });
  }
  return receiver;
}

/**
 * Verifies a QStash signed request. Returns true if valid.
 * Throws an error (with message) if the signature is missing or invalid.
 */
export async function verifyQStash(req: Request): Promise<void> {
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    throw new Error("Missing upstash-signature header");
  }

  const body = await req.text();
  const isValid = await getReceiver().verify({
    signature,
    body,
  });

  if (!isValid) {
    throw new Error("Invalid QStash signature");
  }
}
