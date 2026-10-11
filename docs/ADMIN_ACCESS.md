# Owner / superadmin access

The `owner` role is the highest application role. It is checked in both server handlers and database functions, and includes every implemented staff workflow. The interface labels it **Superadmin**. It is not a PostgreSQL superuser or a bypass for row-level security.

The owner explicitly requested a real superadmin account on 2026-10-11. Bootstrap uses the exact authorized Supabase Auth identity, manually confirms this operator-provisioned account, assigns the database role and records `superadmin_bootstrap` and `owner_test_access` audit entries. Activation permits customer/app testing without asserting policy consent, inventing contact information or assigning a warehouse. Public signup and unapproved commercial features remain gated.

Initial credentials are handed to the owner in a private local file outside this repository. No password, service key, auth token or real account email is committed. After signing in, the owner can set their own password at `/app/security`; changing it signs out all sessions. Customer and admin mode links appear only after a server-side role lookup. Ordinary customers do not receive the admin switcher.

Resend remains deferred. Account creation and the bootstrap flow do not send email. Normal signup/reset-email delivery still requires its separate setup and verification.
