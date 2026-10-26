import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import console from "node:console";
// Produces a minimal config: it never declares signup, redirect allowlists or JWT settings.
const root = process.cwd(),
  output = process.env.PARCELS_AUTH_CONFIG_DIR;
if (!output || !path.isAbsolute(output))
  throw new Error(
    "Set PARCELS_AUTH_CONFIG_DIR to a private absolute temporary directory.",
  );
await fs.mkdir(path.join(output, "supabase"), { recursive: true, mode: 0o700 });
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "emails/auth/manifest.json"), "utf8"),
);
let config =
  'project_id = "parcelsjm-auth-email"\n\n[auth.email.smtp]\nenabled = true\nhost = "smtp.resend.com"\nport = 465\nuser = "resend"\npass = "env(PARCELS_SMTP_PASSWORD)"\nadmin_email = "support@parcelsjm.com"\nsender_name = "Parcels JA"\n';
for (const [name, t] of Object.entries(manifest)) {
  const type = t.security_notification ? "notification" : "template";
  config += `\n[auth.email.${type}.${name}]\n${t.security_notification ? "enabled = true\n" : ""}subject = ${JSON.stringify(t.subject)}\ncontent_path = ${JSON.stringify(path.join(root, t.content_path))}\n`;
}
await fs.writeFile(path.join(output, "supabase/config.toml"), config, {
  mode: 0o600,
});
console.log(
  "Minimal SMTP/template config prepared. Review supabase config diff before push. SMTP password must come from PARCELS_SMTP_PASSWORD; no key is written into the config.",
);
