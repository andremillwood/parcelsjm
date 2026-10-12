import { z } from "zod";
export const authSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("login"),
    email: z.email().max(254),
    password: z.string().min(1).max(128),
  }),
  z.object({
    action: z.literal("register"),
    email: z.email().max(254),
    password: z.string().min(12).max(128),
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(30),
    accountType: z.enum(["personal", "business"]),
    consent: z.literal(true),
  }),
  z.object({ action: z.literal("reset"), email: z.email().max(254) }),
  z.object({
    action: z.literal("password"),
    password: z.string().min(12).max(128),
  }),
  z.object({ action: z.literal("logout") }),
]);
