# Reader Notes live account setup

Deployment URL: `https://shrg182.github.io/reader-notes/`.

## Access required

Use the user's connected Supabase integration or authenticated dashboard. Prefer
a dedicated `reader-notes` project. Do not reuse Daymark's project, copy its keys,
or change its Auth settings without the user's explicit choice. Project creation
may be subject to account limits or billing; do not accept a paid upgrade.

## Provision and verify

1. Select/create the reader project. Record its project reference and public URL.
2. Inspect existing tables before running `schema.sql`. The supplied schema is
   for a fresh installation; never drop existing tables to make it run.
3. Apply `schema.sql`. It adds `reader_documents`,
   `reader_document_versions`, ownership policies, and the revision-checking
   `save_reader_document` RPC in one transaction.
4. Run `verify.sql` in a test project. The fixtures roll back. Confirm owner
   isolation, denied anonymous access, denied direct writes, revision rejection,
   history retention, and deletion markers. Do not claim a successful test until
   the database actually executes it.
5. Enable email/password Auth and email confirmation. Keep anonymous sign-in
   disabled. Keep simultaneous device sessions enabled.
6. Set **Site URL** to `https://shrg182.github.io/reader-notes/`. Add the exact
   same URL to **Redirect URLs**. Add `http://127.0.0.1:8780/` only if local
   authentication testing is required. Do not use a broad GitHub Pages wildcard.
7. Check confirmation and recovery email delivery. Configure the user's SMTP
   provider if required by the project; do not guess credentials or disable email
   verification to bypass delivery problems.
8. Populate only `supabaseUrl` and the public publishable/anonymous client key
   in `config.js`. Never commit database passwords, access tokens, SMTP secrets,
   service-role or secret keys. `appUrl` already targets the deployed reader.
9. Publish and verify the live account form. Have the user create/confirm their
   account and enter their own password. Verify account A cannot access B's
   documents, reopening preserves sessions, and two devices can synchronize.
10. Check password recovery through a real email link. The app consumes the
    callback, removes tokens from the address bar, validates the session with
    Auth, and prompts for a new password. Expired links leave local mode usable.

## Current checkpoint

Sharing adds a separate migration. After the base setup, follow `../SHARING.md`,
apply `sharing.sql` and run `sharing-verify.sql` before enabling `sharingEnabled`.
Existing owner-only documents and notes must not be opened to anonymous readers.

The reader's URL/client key are still blank. On 2026-11-05 the available Firefox
dashboard requested sign-in. A Supabase integration was found but was not yet
installed/connected. Until administration access is available, provisioning and
live security/account tests cannot be completed. Existing calendar data remains
untouched.

Official references:

- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
