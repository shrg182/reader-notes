# Reader Notes · 阅读札记 — foundation preview

Your personal reading and editing workspace.

The interface uses a Sheets-inspired worksheet style: compact green-accented
header, pale toolbars, a column-based library, and bordered editing panels. Phone
layouts keep readable text and touch-sized controls.

## Modular reading tools

The workspace has seven shared tool blocks: Navigate, View, Panes & layout,
Dictionary & vocabulary, Read aloud, Contributions, and Files & recovery. Use **Customize tools**
to show/hide blocks or choose Reading, Study, or Editing presets. Each header
expands/collapses its tools and offers Pin/Unpin. Unpinned blocks collapse when
switching articles; pinned blocks retain their configured expansion. Reading
mode hides every block temporarily; Show tools restores the arrangement.

Save block settings for **This article**, **This file format**, or **My defaults**,
in that precedence order. Current format adapters distinguish editable text
articles (including TXT/Markdown imports) from original PDF references. EPUB is
not yet supported. Phone and desktop settings are stored separately per library
on this device; settings do not yet synchronize to the account's cloud storage.

The **Tools for** selector identifies the target pane. Article navigation has
find-next and jump-to-start; View changes text size/spacing. PDF page search,
zoom and rotation use the browser PDF viewer's controls. Native PDF selection
cannot be captured by the shared toolbar; enter words manually for PDF lookup.
Layout supports side-by-side, stacked and active-pane focus.

Dictionary lookup is a tool, separate from continuous read-aloud controls.
Select article text and choose **Look up selection**, or enter a word manually.
Enable/reorder Wiktionary and Cambridge links, or open Google Translate. External
links transmit the entered word only after a click. There is no automatic lookup
request, built-in dictionary dataset, or OCR. Pronunciation and selected-text
read-aloud use browser speech services and available voices.

Save a word with its language, definition, source context and personal note.
Vocabulary review searches this article or all articles and links to available
source articles. Saved words can be edited/removed. Vocabulary is account-scoped
device data and included in JSON backups; **it does not yet sync to Supabase**.
Account sign-out offers a backup before clearing a device vocabulary cache.
Backup imports validate vocabulary sources and restore words only alongside
missing articles, avoiding changes to existing articles and vocabulary.

Repository: <https://github.com/shrg182/reader-notes>

Website: <https://shrg182.github.io/reader-notes/>

## Reading-item and contribution audiences

Use an item's **Sharing** action or the workspace's **Contributions** block.
Books and each contribution have separate Private / Selected groups / Public
choices. Saving keeps a working draft private; publication requires a separate
preview and action. Public text snapshots exclude separate private notes,
vocabulary, source files and migration archives. A revised edition is a separate
contribution layer, not a replacement for the source.

Private local contribution drafts work now. Live publication, shared reading and
group management are gated by `sharingEnabled` and a configured Supabase project
with the new policies installed. They are **not activated on the deployed site**
yet. See [SHARING.md](SHARING.md) for behavior, limits and setup steps.

## Reader Studio migration

Use **Import from Reader Studio** for a read-only inventory, record preview,
downloadable report, exact original-file retention and small plain-text trials.
It recognizes full editing archives, verified portable packages, article backups,
dictionary exports and optional catalogs. Existing editions are never replaced.
Rich annotation/dictionary conversion and bulk migration remain pending.
See [MIGRATION.md](MIGRATION.md) for source preparation, limits and safeguards.

Device archives are separate from ordinary JSON backups and cloud sync. Keep
your original exports outside the browser. Database version 2 adds migration
stores without deleting existing books; close older tabs if an upgrade is blocked.

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

Backups include current articles, notes, personal contribution drafts, trash, and retained recovery editions.
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
npm ci
npm test
PLAYWRIGHT_PATH=/path/to/playwright npm run test:browser
```

Browser tests need Playwright and installed Google Chrome. They serve this
workspace on an ephemeral loopback port, use isolated temporary browser data,
and mock Supabase requests. They do not contact a production account or prove
deployed SQL security. The SQL verification is separate.

PGlite is a development-only dependency for isolated PostgreSQL permission tests.
No database engine or dependency files are deployed with the static app.

## Next work

Build structured rich editing and stable annotation anchors, private source-file
sync, migration adapters, then EPUB and installable offline support. The current
preview requires a network connection to load its shell; offline drafts work in
an already open tab but there is no service worker yet. Real SQL deployment,
real email recovery, and physical phone/tablet tests remain unverified.
