import { z } from "zod";
import { MAX_DOCUMENT_BYTES } from "./constants";
export { MAX_DOCUMENT_BYTES, DOCUMENT_BUCKET } from "./constants";
const uuid = z.string().uuid();
const reason = z.string().trim().min(10).max(2000);
export const documentSchemas = {
  request: z.object({
    profileId: uuid,
    packageId: uuid.nullable(),
    type: z.enum(["invoice", "payment_proof", "other"]),
    instructions: reason,
  }),
  intent: z
    .object({
      requestId: uuid,
      filename: z
        .string()
        .min(1)
        .max(120)
        .refine(
          (name) =>
            !name.includes("/") &&
            !name.includes("\\") &&
            [...name].every(
              (c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127,
            ),
        ),
      mime: z.enum(["application/pdf", "image/jpeg", "image/png"]),
      size: z.number().int().min(1).max(MAX_DOCUMENT_BYTES),
      amount: z.number().positive().max(1000000).nullable(),
      currency: z.enum(["USD", "JMD"]).nullable(),
      merchant: z.string().trim().max(160),
      orderReference: z.string().trim().max(120),
    })
    .refine((d) => (d.amount === null) === (d.currency === null)),
  complete: z.object({ uploadId: uuid }),
  download: z.object({ uploadId: uuid }),
  review: z.object({
    requestId: uuid,
    version: z.number().int().min(0),
    expected: z.enum(["requested", "uploaded", "under_review", "rejected"]),
    decision: z.enum(["approved", "rejected", "waived"]),
    reason,
  }),
};
// Signature validation is not a malware scan. Every accepted file stays quarantined.
export function sniffDocument(bytes: Uint8Array): string | null {
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) return null;
  const begins = (signature: number[]) =>
    signature.every((n, i) => bytes[i] === n);
  if (
    begins([0x25, 0x50, 0x44, 0x46, 0x2d]) &&
    new TextDecoder().decode(bytes.slice(-1024)).includes("%%EOF")
  )
    return "application/pdf";
  if (
    begins([0xff, 0xd8, 0xff]) &&
    bytes.at(-2) === 0xff &&
    bytes.at(-1) === 0xd9
  )
    return "image/jpeg";
  if (
    begins([137, 80, 78, 71, 13, 10, 26, 10]) &&
    bytes.length >= 45 &&
    new TextDecoder().decode(bytes.slice(12, 16)) === "IHDR" &&
    new TextDecoder().decode(bytes.slice(-8, -4)) === "IEND"
  )
    return "image/png";
  return null;
}
