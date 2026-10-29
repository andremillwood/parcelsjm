# Database handoff for the public shipping release

Use the Supabase SQL Editor in the existing Parcels JA project `pftjfzmbqqzzfxgypwkl`.

1. Confirm the current main-branch identity, queue and billing migrations have already been installed. The new release builds on those features; it does not replace or reset them.
2. Run [20261028_public_shipping_release.sql](20261028_public_shipping_release.sql) once. It installs the two new migrations atomically, preserves existing shipping assignments, creates the owner-supplied US warehouse, adds pickup/delivery preferences and tickets, and records migration history where available. It stops before changes if it detects an existing/partial install. It needs an existing verified owner account.
3. Check the final query output for the North Lauderdale warehouse and the two new tables. No Jamaican pickup location is seeded.
4. In Supabase Auth email templates, publish [confirmation.html](../email-setup/auth-templates/confirmation.html). Preserve the confirmation link. A separate canonical address email is also attempted by the app on initial signup through Resend, with a durable job and retry after confirmation; it does not rely on Auth retaining trigger-generated fields in its in-memory email model.
5. Verify real confirmation/password-reset and address-email receipt in an authorized inbox. Configure the existing server-only Resend sender/key and Supabase service role in Vercel if absent. Do not paste credentials into SQL or Git.

The individual source migrations are `supabase/migrations/20261028043614_public_fulfillment.sql` and `supabase/migrations/20261028133912_signup_shipping_address.sql`. If you already installed the first one, run only the second after checking the schema; do not run the combined bundle over a partial install. Historical files in `email-setup/` were already applied according to the prior setup record and are not part of this pending bundle.

Pickup tickets now require the existing **ready for pickup** release checkpoint, rather than Jamaica arrival alone. Existing finance, customs and document checks remain in force. The initial signup address stays pending until email verification, private identity details and policy/profile requirements are satisfied.

The public signup policy gate remains closed pending policy approval. Installing this SQL does not publish draft policies, enable signup, activate historical notification jobs or authorize shipment release.
