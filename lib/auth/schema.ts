import { z } from "zod";
export const registrationSchema = z.object({
  action: z.literal("register"),
  email: z
    .email("Enter a valid email address.")
    .max(254, "Use an email address of 254 characters or fewer."),
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use 128 characters or fewer."),
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Use 120 characters or fewer."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a contact phone number.")
    .max(30, "Use 30 characters or fewer."),
  trn: z
    .string()
    .trim()
    .regex(
      /^\d{3}[ -]?\d{3}[ -]?\d{3}$/,
      "Enter your 9-digit TRN, with optional spaces or hyphens.",
    )
    .transform((value) => value.replace(/[ -]/g, "")),
  homeAddress: z
    .string()
    .trim()
    .min(
      10,
      "Enter your full residential address, including town, parish and country.",
    )
    .max(500, "Use 500 characters or fewer.")
    .refine(
      (value) => !value.includes("\0"),
      "Remove unsupported characters from your address.",
    ),
  accountType: z.enum(["personal", "business"]),
  consent: z.literal(true, {
    error: "Confirm the acknowledgement to continue.",
  }),
});
export const registrationFields = [
  "accountType",
  "fullName",
  "email",
  "phone",
  "trn",
  "homeAddress",
  "password",
  "confirmPassword",
  "consent",
] as const;
export type RegistrationField = (typeof registrationFields)[number];
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;
export function registrationErrors(
  issues: readonly z.core.$ZodIssue[],
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  for (const issue of issues) {
    const name = issue.path[0] as RegistrationField;
    if (registrationFields.includes(name) && !errors[name])
      errors[name] = issue.message;
  }
  return errors;
}
export const authSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("login"),
    email: z.email().max(254),
    password: z.string().min(1).max(128),
  }),
  registrationSchema,
  z.object({ action: z.literal("reset"), email: z.email().max(254) }),
  z.object({
    action: z.literal("password"),
    password: z.string().min(12).max(128),
  }),
  z.object({ action: z.literal("logout") }),
]);
