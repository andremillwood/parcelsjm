import { createHmac } from "node:crypto";
import { leadSchema, type LeadInput } from "./schema";
export type LeadDependencies = {
  enabled: boolean;
  origin: string;
  hashSecret: string;
  clientIp: string;
  save: (
    input: LeadInput,
    hashes: { email: string; ip: string; payload: string },
  ) => Promise<"accepted" | "limited" | "conflict">;
  notify: (id: string) => Promise<void>;
};
const reply = (status: number, error?: string) =>
  Response.json(error ? { error } : { accepted: true }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
export async function handleLead(request: Request, deps: LeadDependencies) {
  if (!deps.enabled)
    return reply(
      503,
      "Inquiries are temporarily unavailable. No information has been saved.",
    );
  if (request.headers.get("origin") !== deps.origin)
    return reply(403, "Please submit the form from this website.");
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return reply(415, "Please submit the inquiry form.");
  // Bound the stream, including chunked requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return reply(400, "Please complete the inquiry form.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) {
        await reader.cancel();
        return reply(413, "Your inquiry is too long.");
      }
      chunks.push(value);
    }
    const parsed = leadSchema.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    if (!parsed.success)
      return reply(
        400,
        "Check the required fields and consent before sending.",
      );
    const input = parsed.data;
    const hash = (value: string) =>
      createHmac("sha256", deps.hashSecret).update(value).digest("hex");
    const result = await deps.save(input, {
      email: hash(input.email),
      ip: hash(deps.clientIp),
      payload: hash(JSON.stringify(input)),
    });
    if (result === "limited")
      return reply(429, "Too many inquiries. Please try again in an hour.");
    if (result === "conflict")
      return reply(
        409,
        "This inquiry was already submitted with different details. Reload before starting a new inquiry.",
      );
    // Durable inquiry and notification exist before acknowledging. Provider failure
    // must not misrepresent a saved inquiry as lost, or create duplicate leads.
    try {
      await deps.notify(input.requestId);
    } catch {
      /* Outbox remains retryable. */
    }
    return reply(202);
  } catch (error) {
    if (error instanceof SyntaxError)
      return reply(400, "Please complete the inquiry form.");
    return reply(
      503,
      "We could not confirm your inquiry. Please retry without changing your details.",
    );
  } finally {
    reader.releaseLock();
  }
}
