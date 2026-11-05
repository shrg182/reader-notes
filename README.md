# Reader Notes · 阅读札记 — foundation preview

Your personal reading and editing workspace.

The interface uses a Sheets-inspired worksheet style: compact green-accented
header, pale toolbars, a column-based library, and bordered editing panels. Phone
layouts keep readable text and touch-sized controls.

Repository: <https://github.com/shrg182/reader-notes>

Website: <https://shrg182.github.io/reader-notes/>

GitHub Pages deployment is defined in `.github/workflows/pages.yml`. Set the
repository's **Settings → Pages → Source** to **GitHub Actions**. Pushes to
`main` run unit checks and publish only the app's public assets; project notes,
SQL scripts and tests are excluded from the deployed website. Account/cloud
features still require the Supabase configuration described below.

The product and delivery plan is [READER_NOTES_SCHEME.md](READER_NOTES_SCHEME.md).
This is a new local project; it does not modify Study Studio, Daymark Calendar,
or Personal Reader.

The new app is named **Reader Notes**, with project name `reader-notes`, to
distinguish it from the existing Reader Studio / Study Studio. Existing preview
device storage and tab-lock identifiers remain unchanged to preserve drafts and
coordinate older tabs. New backups use `reader-notes`; earlier preview backups
with the `reader-studio` format remain importable. This compatibility does not
imply support for the existing Study Studio's different export formats.

## Run

Requires Python 3 for a local static server; no package installation is needed.

```sh
npm start
```

Open <http://127.0.0.1:8780>. Use this stable address rather than opening
`index.html` directly: browser storage belongs to the origin. Use HTTPS for
public hosting. Native PDF display depends on the browser.

## Implemented

- Local library, create/edit articles, UTF-8 TXT/Markdown imports (plain text).
- Title, language, article text, separate reading notes, local autosave.
- Reference PDF alongside the editor; PDF retained in IndexedDB on this device.
- Search, trash/restore, 30 previous device editions and edition restoration.
- Versioned JSON backups, validated imports, preview, skip existing article IDs.
- Account-specific libraries and caches, email/password account integration,
  password-reset link flow, refresh tokens, and local-device sign-out.
- Atomic server revision checks, conflict comparison with both editions retained,
  tombstones, offline draft queue, explicit/online/periodic synchronization.
- One editing tab per library in a browser profile using Web Locks.

The app saves local drafts after a short idle delay. Save & sync commits any
remaining editor changes immediately. The queue retries when connectivity
returns and once per minute when the editor is not focused. Close/reload warns
while a write or unsaved change is pending. Once the device save completes,
pending cloud changes survive reopening this browser.

Signed-out mode is a shared browser notebook. Signed-in mode does not upload
that notebook: export locally, sign in, then explicitly import if desired.
Signing out clears the account's device cache; pending drafts must be synced or
resolved first. Export backups before clearing browser data.

## Configure a reader Supabase project

Cloud mode is **not configured by default**. No existing app's project key is
copied. Use a new project so this migration cannot affect the calendar.

1. Create a user-owned Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql) once in the new project's SQL
   editor. Keep backups before any later schema upgrade.
3. Configure email/password authentication, email confirmation and email delivery.
   Set the Site URL and allowed redirect URL to the app's exact origin/path.
   Password reset uses the implicit recovery link tokens; the app validates the
   token with Auth, removes the URL fragment, and opens a new-password form.
4. Set `supabaseUrl` and `supabaseKey` in `config.js`. Use a publishable key or
   legacy anonymous client key. Never use a service-role key. This configuration
   is public and ownership policies are the actual access boundary.
5. Run [supabase/verify.sql](supabase/verify.sql) in a disposable test project;
   it rolls back its fixtures. Check two actual accounts and two devices too.
6. Open the app and create/confirm an account. A valid confirmation link signs
   you in; you can also sign in with your password. Signup and recovery links
   target the configured `appUrl` (the production Reader Notes URL by default).

The exact project provisioning and Auth settings checklist is in
[supabase/SETUP.md](supabase/SETUP.md). Saved sessions are bound to their project
URL, so changing projects does not reuse a token issued by another project.

The database stores one document per article in this first stage, with immutable
server revisions. Source PDF upload and cloud history browsing arrive in stage 2.
Server history can currently be inspected through the owner-protected
`reader_document_versions` table. Device history is available in the workspace.

## Backups and limits

Backups include current articles, notes, trash, and retained recovery editions.
They exclude authentication tokens, account identity, and PDF bytes. Imports
validate every record before writing, are transactional, and add missing IDs
only. Recovery editions are restored as device history, not as queued cloud
conflicts. Keep the JSON backup and original reference PDFs together.

Limits: 200-character titles; 40-character language labels; one million UTF-16
code units each for text and notes; 2 MB text imports; 25 MB PDF/import backups;
5,000 articles per backup import. A large export including history may exceed
the import size limit; large-library backup packaging is future work.

## Verification

```sh
npm test
PLAYWRIGHT_PATH=/path/to/playwright npm run test:browser
```

Browser tests need Playwright and installed Google Chrome. They serve this
workspace on an ephemeral loopback port, use isolated temporary browser data,
and mock Supabase requests. They do not contact a production account or prove
deployed SQL security. The SQL verification is separate.

## Next work

Build structured rich editing and stable annotation anchors, private source-file
sync, migration adapters, then EPUB and installable offline support. The current
preview requires a network connection to load its shell; offline drafts work in
an already open tab but there is no service worker yet. Real SQL deployment,
real email recovery, and physical phone/tablet tests remain unverified.
