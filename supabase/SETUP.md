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

On 2026-11-05 the dedicated project `zkffujfbzbxoexohcmwk` was provisioned.
Both migrations were installed successfully in the initially empty public schema.
Both verification scripts executed successfully with rollback-only fixtures before
real accounts were created. No fixture users remain. Anonymous REST checks denied
access to documents, contribution drafts, and group invites; public snapshot
endpoints returned empty arrays. The public publishable key is in `config.js` and
sharing is enabled. The calendar project was not modified.

Email/password signup and email confirmation are enabled; anonymous sign-in is
disabled. Site URL and the sole allowed redirect are exactly the deployment URL.
Gmail custom SMTP was saved by the user and verified after a dashboard reload:
`smtp.gmail.com`, port `465`, sender name `Reader Notes`. The sender address is
configured privately in Supabase. No SMTP credential is stored in this repository.
The user explicitly deferred the personal Gmail deliverability concern and any
migration to a transactional mail provider; keep that as future work.
Real signup/confirmation, password recovery, and simultaneous physical-device
sync remain unverified. No test email was sent and no real password was entered
by the agent. See https://supabase.com/docs/guides/auth/auth-smtp.

Official references:

- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
