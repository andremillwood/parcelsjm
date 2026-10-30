import { POLICY_VERSION } from "../policies/current";
export function authAvailable() {
  return (
    process.env.AUTH_ENABLED === "true" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
export function safeNext(value: string | null | undefined) {
  if (
    !value ||
    value.includes("\\") ||
    value.includes("%") ||
    /[\r\n]/.test(value)
  )
    return "/app";
  try {
    const url = new URL(value, "https://local.invalid");
    return url.origin === "https://local.invalid" &&
      /^\/app(?:\/|$)/.test(url.pathname)
      ? url.pathname + url.search
      : "/app";
  } catch {
    return "/app";
  }
}

export function registrationAvailable() {
  return (
    authAvailable() &&
    process.env.ACCOUNT_POLICIES_APPROVED === "true" &&
    process.env.ACCOUNT_POLICY_VERSION === POLICY_VERSION
  );
}
