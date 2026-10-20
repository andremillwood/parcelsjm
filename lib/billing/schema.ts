import { z } from "zod";
import { moneyCents, weightMilli } from "./pricing";
const reason = z.string().trim().min(5).max(2000),
  uuid = z.uuid();
const money = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:\.\d{1,2})?$/)
  .transform(moneyCents);
const version = z.coerce.number().int().positive();
const base = { id: uuid, version };
export const billingSchemas = {
  draft: z.object({
    packageId: uuid,
    weight: z
      .string()
      .trim()
      .refine((v) => {
        try {
          weightMilli(v);
          return true;
        } catch {
          return false;
        }
      }, "Enter a valid weight."),
    dutiesTax: money,
    handling: money,
    localDelivery: money,
    storage: money,
    evidence: reason,
    due: z.union([z.iso.datetime(), z.literal("")]).default(""),
  }),
  quote: z.object({
    packageId: uuid,
    weight: z
      .string()
      .trim()
      .refine((v) => {
        try {
          return weightMilli(v) > 10000;
        } catch {
          return false;
        }
      }),
    amount: money.refine((v) => v > 0),
    evidence: reason,
  }),
  status: z.object({
    ...base,
    decision: z.enum(["issue", "dispute", "resolve_dispute", "void"]),
    message: z.string().trim().min(5).max(1000),
    reason,
  }),
  payment: z.object({
    ...base,
    amount: money.refine((v) => v > 0),
    channel: z.string().trim().min(2).max(80),
    reference: z.string().trim().min(3).max(160),
    evidence: z.string().trim().min(5).max(1000),
    reason,
  }),
  reversal: z.object({
    ...base,
    paymentId: uuid,
    reference: z.string().trim().min(3).max(160),
    evidence: z.string().trim().min(5).max(1000),
    reason,
  }),
  adjustment: z.object({
    ...base,
    direction: z.enum(["credit", "debit"]),
    kind: z.enum([
      "shipping",
      "duties_tax",
      "handling",
      "local_delivery",
      "storage",
    ]),
    amount: money.refine((v) => v > 0),
    description: z.string().trim().min(5).max(500),
    reason,
  }),
  costs: z.object({
    ...base,
    freight: z
      .union([money, z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    receiving: z
      .union([money, z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    consolidation: z
      .union([money, z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    payment: z
      .union([money, z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    last_mile: z
      .union([money, z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    other: z
      .union([money, z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    evidence: reason,
  }),
  rate: z.object({
    rates: z.string().transform((s, ctx) => {
      try {
        const values = s.split(",").map((v) => moneyCents(v.trim()));
        if (values.length !== 10 || values.some((v) => v <= 0)) throw Error();
        return values;
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Enter ten positive JMD prices separated by commas.",
        });
        return z.NEVER;
      }
    }),
    effective: z.iso.datetime(),
    reason,
  }),
  "approve-rate": z.object({ id: uuid, reason }),
};
