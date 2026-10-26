import { Webhook } from "svix";
import { z } from "zod";
const eventSchema = z.object({
  type: z.enum([
    "email.sent",
    "email.delivered",
    "email.bounced",
    "email.complained",
    "email.failed",
    "email.delivery_delayed",
  ]),
  data: z.object({
    email_id: z.string().min(1).max(200),
    tags: z
      .union([
        z.record(z.string(), z.string()),
        z.array(z.object({ name: z.string(), value: z.string() })),
      ])
      .optional(),
  }),
});
export function verifyEmailEvent(
  payload: string,
  headers: Headers,
  secret: string,
) {
  if (Buffer.byteLength(payload) > 65536) throw new Error("Payload too large");
  const receipt = headers.get("svix-id");
  if (!receipt || receipt.length > 200) throw new Error("Invalid receipt");
  new Webhook(secret).verify(payload, {
    "svix-id": receipt,
    "svix-timestamp": headers.get("svix-timestamp") ?? "",
    "svix-signature": headers.get("svix-signature") ?? "",
  });
  const result = eventSchema.safeParse(JSON.parse(payload));
  if (!result.success) return null;
  const tags = result.data.data.tags;
  const hint = Array.isArray(tags)
    ? tags.find((t) => t.name === "notification_id")?.value
    : tags?.notification_id;
  return {
    receipt,
    provider: result.data.data.email_id,
    type: result.data.type,
    hint: hint && z.uuid().safeParse(hint).success ? hint : null,
  };
}
