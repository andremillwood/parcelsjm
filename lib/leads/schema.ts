import { z } from "zod";
export const leadSchema = z
  .object({
    kind: z.enum(["contact", "business", "rates"]),
    name: z.string().trim().min(2).max(120),
    email: z
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(30).optional().default(""),
    message: z.string().trim().min(10).max(2000),
    monthlyVolume: z.number().int().min(1).max(100000).optional(),
    category: z.string().trim().max(120).optional(),
    consent: z.literal(true),
    website: z.string().max(0),
    requestId: z.uuid(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.kind === "business" &&
      (!data.monthlyVolume || !data.category?.trim())
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Business inquiries need estimated monthly volume and a product category.",
        path: ["monthlyVolume"],
      });
  });
export type LeadInput = z.infer<typeof leadSchema>;
