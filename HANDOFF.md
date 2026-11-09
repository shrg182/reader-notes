# Study Studio rich editor — version 0.6

The user requested Study Studio UI and inherited editing behavior. Added a trusted
shared editor adapter in `studio/`, `rich-editor.js` and `rich-model.js`. This
replaces the default textarea workflow with a sandboxed rich editor, full toolbar,
All Notes sidebar, ruby/pinyin, linked editable footnotes, comments, media,
undo/redo, dictionaries, speech, exports, layout/theme controls and bottom dock.
The original app/source files remain untouched.

Structured rich editions are stored as `reader_documents.rich_state` text through
`save_reader_rich_document`, with owner binding, existing CAS/revision history and
legacy plaintext compatibility. The user installed `supabase/rich-editor.sql` and
reported success; live anonymous RPC/column probes return 401. CUA native pipe
startup failed, including after reset, so authenticated production UI checks
require user confirmation. No browser credentials were read or copied. Live anonymous rich-save and rich-column
probes both returned 401 after installation.

Static-only offline shell and browser installation support are included. Private
import payload caches are scoped and cleared on sign-out. Original rich data is
restored lazily; newer working plaintext remains authoritative and recovery
editions are retained. See `STUDIO_EDITOR.md` for limits and verification.

Verification: 31 model/SQL tests; existing browser regression suite; complete
migration browser test; rich editor test with the exact Rongzhai seed, ten
footnotes, ruby, private notes, undo/redo, save/reopen, offline reopening and
desktop/mobile screenshots; a separate two-device account simulation with media.
All passed. Static editor assets are bundled into a nonce-protected sandbox so
offline use does not require opaque-frame network requests.

---

# Study Studio hierarchy restored — 2026-11-05

Library groups imported editions by the original category → collection → article
hierarchy. Public labels come from Studio build_index.py; private source paths and
legacy keys come from an owner-protected security-invoker metadata view installed
with `supabase/migration-categories.sql`. Source/saved editions share collections.
Filters, edition counts, chapter ordering and collapsible sections are included.
New articles use My reading materials. No user content was modified/reimported.

Live verification: 510 editions in 21 collections across six populated Studio
categories. The grouped library and filters were visually inspected after reload.
Separator-safe metadata extraction reads only edition metadata; preserved payloads
are unchanged.

28 unit/SQL tests and both browser suites pass. Anonymous live metadata-view access
returns 401. The view's isolation is also covered by the cross-account SQL test.

---

# Private complete migration support — 2026-11-05

Version 0.5 adds `migration-library.js`, `migration-complete-ui.js`,
`tools/build_studio_bundle.py` and `supabase/migration.sql`. The new schema was
installed in the Reader Notes project with explicit user approval; anonymous
REST access was checked and denied. All preservation records are owner-only.
Source files and the user-confirmed October 31 archive were prepared outside Git
in `/private/tmp/reader-notes-complete-migration.json` (owner-only permissions).
It contains 510 editions (404 source + 106 saved/personal variants), 2,726 dictionary
entries, 3,870 occurrences and 11 corrections. Different editions are kept separate.

Rich content is sanitized and rendered in a sandboxed iframe with a deny-all CSP.
Original study records, archive bytes, source HTML, histories and dictionary CSV
columns are retained as private cloud records, separate from editable working text.
Source PDF/EPUB/IndexedDB binaries absent from the export are not included. Their
references are preserved. Ordinary text backups omit preservation data; retain
original exports and the complete package separately.

Validation: 27 unit/SQL tests; new browser integration verifies private cloud import,
inert rich preview and idempotent reimport. Existing browser suite also passes.
Actual import completed in the signed-in private account through the published
app: 558 private preservation records and 510 editable editions. Success UI reported
all dictionary counts; a reload synchronized the library. Both source and saved
Sunzi editions appeared separately; rich pinyin/inline notes and history controls
were inspected, and an imported English dictionary query returned a match.
Anonymous import-record access remained HTTP 401 after upload. The full library
was left open with the temporary search cleared.

Private durable package and fingerprint/report are in ignored `private-migrations/`
with owner-only permissions. Original exports/source files remain untouched.
No private package, original article body, source export or SMTP secret was added
to the repository. Public app deployment `5b18dc2` succeeded.

---

# Current live account checkpoint — 2026-11-05

The dedicated Reader Notes project is `zkffujfbzbxoexohcmwk`. Both database
migrations and rollback verification scripts ran successfully against the new,
empty project. Anonymous API checks deny private documents/drafts/invitations;
only reviewed public snapshots are readable. `config.js` now contains its public
publishable key and enables sharing. Auth confirms email, disables anonymous
sign-in, and returns only to the exact Reader Notes deployment URL.

Gmail custom SMTP was saved by the user and verified after a dashboard reload.
Personal Gmail deliverability concerns and a future transactional-provider migration
are explicitly deferred at the user’s request. Real signup/recovery email delivery,
account confirmation, and two-device sync remain unverified. No real credentials were collected, no emails sent, and the
calendar database was untouched. See `supabase/SETUP.md`.

The historical entries below describe earlier checkpoints and are superseded by
this checkpoint for live database/configuration status.

---

# Reader Notes · 阅读札记 checkpoint

Updated: 2026-11-05 (America/Detroit)

## Request and direction

The user requested a Markdown scheme and authorized proceeding with a new
reader/editor combining Study Studio features and Daymark-style accounts and
database storage. The scheme is in `READER_NOTES_SCHEME.md`.

The user subsequently approved **Reader Notes · 阅读札记** as the new app's
name, with `reader-notes` as the project name. Visible branding and new backup
names/formats now use Reader Notes. Legacy preview backup imports remain
supported; IndexedDB and Web Lock identifiers are retained to preserve existing
drafts and coordinate older preview tabs. The existing Reader Studio stays a
separate application.

## Completed locally

Foundation preview 0.1: static web app, IndexedDB library, plain-text edition
editor and notes, device-retained PDF reference pane, search, trash/restore,
30-edition local history, validated JSON backup/import, separate account caches,
Supabase REST auth/session/recovery integration, revision-aware sync and conflict
review, and transactional database schema/security verification scripts.

No existing application was changed. No private legacy exports were imported.
No live Supabase project was created, configured or migrated. `config.js`
intentionally contains empty connection settings.

The user supplied `https://github.com/shrg182/reader-notes` as the repository.
It was empty when checked. The initial foundation was pushed on `main` as
`7a43b0c`. The user then supplied `https://shrg182.github.io/reader-notes/`;
the initial check returned HTTP 404. `.github/workflows/pages.yml` adds unit
checks and a Pages deployment containing public app assets only. Repository
Pages must use the GitHub Actions source. Verify live deployment separately.

## Sheets-style interface

The user requested Sheets styling. `styles.css` and the shared HTML header now
follow the existing Studio's worksheet theme: green document mark, compact
sans-serif chrome, pale toolbars, column-based library rows, metadata cells and
bordered editor/reference panels. Article text retains a book-like serif face.
Phone layouts stack library fields and keep 44px touch controls. Existing browser
regressions passed after the change; desktop and mobile screenshots were
visually inspected. Saving, accounts and storage formats are unchanged.

## User-system setup checkpoint

The user requested live account configuration, then chose to install and connect
Supabase. A matching integration was found and suggested, but its connection has
not yet been confirmed. Firefox's dashboard currently requires sign-in. Do not
substitute the calendar project's public configuration or describe provisioning
as complete. Resume the original setup immediately when the integration is
connected; `supabase/SETUP.md` records the exact project/Auth settings.

Prepared explicit production redirects for signup/recovery, confirmation-link
session validation, project-bound remembered sessions, recovery-form errors and
expired-link handling that preserves local reading. Mocked browser scenarios
passed signup/reset redirects, confirmation, password update and expired links,
in addition to existing account isolation/conflict/offline checks. Unit tests
passed (5). No real account emails or password changes were performed, and no
live database migration has been run. `config.js` still has blank project URL
and client key; only the production app redirect is populated.

## Modular toolbar and dictionaries — preview 0.2

The user approved a universal block toolbar and dictionaries categorized as
tools. `toolbar-model.js` defines the block catalog, article/PDF capabilities,
preference inheritance and vocabulary backup validation. `toolbar.js` provides
six blocks, visibility/expansion/pinning, reading mode, presets, per-article /
format / default preferences, and separate phone/desktop profiles. Modules must
be included in the Pages artifact (workflow updated).

Dictionary & vocabulary supplies selection/manual lookup, ordered external
Wiktionary/Cambridge links, Google Translate link, browser pronunciation, word
capture/edit/remove, context and personal notes, cross-article review and source
navigation. Read aloud is a separate block. External lookup is click-only;
native PDF selections cannot cross the browser viewer boundary. PDF navigation
and zoom use its native controls; no unsupported OCR or EPUB capability is claimed.

Vocabulary lives in account/local-scoped IndexedDB settings and is included in
JSON exports. Import validation rejects invalid/orphaned/duplicate word IDs and
atomically writes added articles plus their vocabulary. Existing article IDs and
their vocabulary are skipped. Account sign-out with vocabulary requires exporting
a backup first, because vocabulary has no cloud copy. Preference and vocabulary
cloud synchronization are still future work; reader Supabase setup remains pending.

Expanded blocks use full-width rows to avoid large blank areas. Unsaved
vocabulary fields have navigation/reload guards. Browser coverage includes word
capture, vocabulary backup round-trip, hidden blocks, persisted pin/visibility,
reading mode, PDF capability switching, and phone layout selection. Unit suite
expanded to 8 tests including inheritance and vocabulary validation.

## Reader Studio migration workbench — preview 0.3

The user approved proceeding with migration inventory/preview. Added
`migration-model.js` and `migration-ui.js`, the library's **Import from Reader
Studio** button and `MIGRATION.md`. Source adapters handle full archives,
fingerprint-verified portable packages, reader-article-v1 backups, optional
catalogs, dictionary CSV/JS datasets and corrections, plus source-file staging.
Raw HTML/JS is never executed. Reports omit raw storage values.

The workbench offers read-only inspection, paginated previews, original/report
downloads, and explicitly acknowledged trials of up to 10 plain-text copies.
Unsupported rich data stays in original files; this is not a full-fidelity bulk
migration. Stable source IDs, legacy chapter-version grouping and destination
checks prevent duplicate/replacement imports. Trial writes and original-file
staging are atomic, with add-only book inserts for stale-preview protection.

IndexedDB version 2 adds `migration_files` and `migration_batches`; existing
stores survive. Version-change/blocked handling requests closing older tabs.
Staged originals are device/account-scoped caches, excluded from standard JSON
backups/cloud sync and cleared on account sign-out. Selected input files are
untouched; preserve them outside the browser.

Unit suite: 18 tests passed. Read-only inspection of the existing October 31
archive plus catalog/dictionary files detected 375 archive records, 101 supported
article versions / 80 identities, 2,726 dictionary entries, 3,870 occurrences and
11 corrections; no format errors. 34 versions require a source-version choice.
This inspection did not stage or import actual user data and did not copy source
archives into this repo. Browser fixtures cover old-database upgrade, unchanged
preview/staging, source-byte recovery, trial acknowledgement, repeat/conflicting
imports and atomic rollback, alongside previous reading/account checks.

The full Chrome browser suite passed these migration scenarios plus all prior
reading, toolbar and mocked-account checks. Mobile preview screenshot inspected.
A local report was saved as
`/private/tmp/reader-notes-migration-inventory-2026-11-05.json` with owner-only
permissions for user review; it is outside the repository. It contains inventory
metadata, not raw source records. No actual material was imported into the app.

## Independent audiences and contribution layers — preview 0.4

The user approved Private / Selected groups / Public access for books and for
each personally added contribution, including revisions to public books. Added
`sharing-model.js`, `sharing-ui.js`, a Contributions block, per-library-item Sharing
action, Shared library, reading-group controls and `#read=<publication UUID>` links.
Types cover pinyin, inline notes, annotations, footnotes, reading notes, highlight
explanations and revised editions. Rendering is currently a passage-linked layer
panel rather than rich inline/ruby markup. Alternative editions do not replace
the shared source. The old reading-notes field is explicitly labelled Private.

Source publications snapshot only title/language/text. Private contribution
drafts and shared snapshots are separate records. Saving a draft, even with a
requested public audience, cannot publish it. Explicit reviewed publication or
withdrawal changes only that contribution. Backend revisions, group membership,
source audience caps and Unicode/CRLF quote anchors are checked. Source trash
withdraws publication; restoration does not republish. Deleting a source/account
does not cascade into another reader's independently owned private notes.

`supabase/sharing.sql` is an additive migration after the base schema, with RLS,
revoked direct writes, auth-bound RPCs, owner-only version history, hashed seven-day
group invitation codes and group join/removal/revocation. No invitation messages
are sent automatically. `supabase/sharing-verify.sql` is a rollback-only test.
PGlite is a locked development dependency; `npm ci` is now required for tests
and CI. No database engine or test dependency ships in the static site artifact.

Contribution drafts are account/local-scoped settings. JSON backups include them,
but exclude active publication grants. Restore gives missing contributions fresh
IDs/provenance and private audiences; repeat imports skip existing provenance.
Account sign-out offers a study-data backup before clearing local contribution
caches. Private conflicts preserve both versions and allow keeping the device
edition as a separate private draft.

Live sharing is NOT activated. `config.js` retains blank reader URL/key and
`sharingEnabled: false`. The Supabase connection was never confirmed. Do not
copy the calendar connection or claim deployed policies were verified. Follow
`SHARING.md`, configure the reader project, apply schema/sharing migrations, run
the test SQL and real-account checks, then enable the flag. Dictionaries, original
file sharing, standalone orphan-note UI and shared-reader toolbar parity remain
future work; legacy material stays private by default.

Validation adds pure sharing tests and executes both SQL migrations plus the
verification script in isolated PGlite PostgreSQL with fixture Auth roles. This
tests actual SQL/RLS semantics, not a live Supabase JWT gateway. Chrome mocks
cover group organizer controls, public source with private pinyin, independent
public footnotes/revisions, private updates that do not replace public snapshots,
withdrawal, anonymous links and private backup restoration. No real project,
group, account, invitation or publication was created during development.

Release verification: all 25 unit/SQL tests passed, including the rollback-only
sharing verification script running in PGlite. The full Chrome suite passed prior
reading/migration/auth scenarios and new public/private/group UI flows, private
backup restore defaults, anonymous alternative-edition viewing, independent
withdrawal and sign-out study backup/DOM cleanup. Desktop/public-reader and phone
sharing screenshots were visually inspected. Actual Supabase activation remains
pending; `sharingEnabled` is intentionally false in the deployed configuration.

Next: rich document/annotation and dictionary-library models, additional legacy
adapters and source-file matching before full migration. Supabase setup remains
pending its confirmed connection; do not claim account/dictionary cloud sync.

## Verification performed

- `npm test`: 5 tests passed.
- JavaScript syntax checks: passed for app, cloud and storage modules.
- `npm run test:browser` using installed Chrome and the documented Playwright
  path: passed local persistence/history/backup/trash/mobile/tab-lock and mocked
  account isolation/conflict/offline-retry scenarios.
- Browser checks also verify autosave preserves typing focus, PDFs survive a
  reload on the same device, and PDFs are excluded from JSON restores.
- Desktop and mobile screenshots rendered and visually inspected. Generated
  screenshots are in ignored `test-results/`.
- Browser tests required sandbox escalation for a temporary loopback server.
  They used isolated browser contexts and mocked remote requests.
- SQL scripts have NOT been executed against PostgreSQL/Supabase. Real account,
  email recovery and physical device behavior remain unverified.

## Start and configuration

Run `npm start`, then open `http://127.0.0.1:8780`. See `README.md` for setup,
limits and verification. Cloud setup needs a dedicated user-owned Supabase
project, public project URL/client key, configured Auth redirects/email, and the
included schema installed and verified in a test project first.

## Next implementation

1. Configure/verify real accounts and database policies when a reader project is
   available; include simultaneous-device and actual password recovery checks.
2. Introduce structured rich editing and separate chapter/annotation records,
   stable anchors and format-safe exports, following the scheme's parity list.
3. Add private PDF asset cloud storage, integrity metadata and storage policy
   tests; source PDFs currently remain device-only.
4. Build previewable legacy migration adapters, then EPUB, advanced panes,
   reading review and installable offline app behavior.

## Important limitations

This is a foundation preview, not full Study Studio parity. Markdown imports are
plain text; advanced formatting, inline annotations, EPUB, shared catalogs,
service-worker offline loading and source-file synchronization are future work.
Cloud history is retained by SQL but only device history is browsable in the UI.
Large exports with history may exceed the current 25 MB import limit.


### Catalog update 0.7 — 2026-11-05
- Study Studio compact category/collection catalog, article-level counts, saved/source editions disclosure, numeric source ordering, Library tools menu.
- Imported reading/editing activity displayed from private preserved study records. New reading visits are account-scoped device-local settings, deliberately disclosed in the reading-cell tooltip. No new Supabase schema required.
- Real attached PDFs only. Source/saved edition documents remain unchanged by grouping; no destructive deduplication.
- Added identity regression tests and isolated desktop/mobile catalog browser verification (`tests/catalog-browser.cjs`). Existing browser tests use Open editor and Library tools controls.


### Restored toolbar 0.7.1 — 2026-11-06
The modular Reader Notes toolbar is always available above the embedded Study Studio toolbar. It retains existing per-article visibility, expansion and pin preferences. Its Reading mode control collapses the modular blocks while the original Studio toolbar remains available. Expanded blocks scroll within a bounded panel to preserve editor space on phones. Article details retains the separate metadata/reference controls. Parent search, article-start, text size, spacing and layout controls now forward through the existing nonce-bound iframe bridge; rich selections feed the dictionary and read-aloud blocks. No database change. Verified with rich browser desktop/mobile screenshots, search, text size, collapse/restore and existing rich editing/offline checks.


### Compact header / account organization 0.8 — 2026-11-06
- Library uses compact brand + My Account + synchronization status, search/New/Filters/More, and article count. Email and detailed storage counts moved to Account. Routine sync banner suppressed visually; errors stay visible.
- Account groups existing auth/security, default tools, groups/invitations, owner-filtered publication overview, backup/import and synchronization controls. Publication overview is read-only until existing explicit sharing actions are used. No new SQL.
- Existing control IDs/handlers retained; tests follow moved controls. Files & recovery has an Account shortcut for the rich editor. Last successful library synchronization stored per account on this device and cleared on signout.


### Clickable catalog titles 0.8.1 — 2026-11-06
Article titles are now keyboard-accessible buttons styled as text, opening the saved working edition by default. The duplicate Open editor action, generated ordinal numbers and per-row Editions menu are removed. Book summaries retain native expand/collapse and keyboard behavior but hide disclosure markers; spacing, type size, open-state shading and focus outlines distinguish hierarchy. Exact repeated collection prefixes are shortened for display only; full stored titles, chapter numbers and search remain intact. All independent working/source editions and preserved snapshots remain accessible through Files & recovery → Original editions & study data. No document migration, deletion or permission changes.


### Book title counts removed 0.8.2 — 2026-11-06
Collection/book headings now display their titles without article-count suffixes. The library total, category summaries, filter counts and account statistics remain available. No stored data changes.

---

# Cloud PDF library prepared — 2026-11-08 (not activated or published)

Added private first-class PDFs: Library Import PDF, local/cloud-provider file
picker, 25 MiB validation, account-owned synced categories (including assignments
for existing text articles), PDF.js page/zoom/search/text selection, notes,
position, read status, offline copy removal, trash/restore and retryable permanent
deletion. TUS checkpoints and file bytes are account-scoped; interrupted uploads
resume or restart after URL expiry. Permanent deletion uses Storage API removal
before purging notes/metadata; a tombstone rejects stale-device resurrection.

Migration: `supabase/pdf-library.sql`. Setup and limits: `PDF_LIBRARY.md`.
The feature flag is deliberately false in `config.js` until that migration is
installed in `zkffujfbzbxoexohcmwk` and live Storage privacy verified. No production
SQL, buckets, or data were changed, and these changes have not been published.
Supabase integration was discovered but is not connected. The user asked how to
connect; instructions were given in chat. Await connection, then inspect existing
Storage policies, install the additive migration, verify real authenticated
upload/download and account isolation, enable the flag and publish. Do not copy
credentials from browser storage or ask for secret keys in chat.

Checks passed: 36 unit/database tests (PGlite Storage-schema fixture), existing
browser suite, rich-editor browser suite, and new PDF browser suite. The latter
uses real vendored PDF.js/TUS with a mocked cloud API and covers import,
rename/category moves, second-device viewing, owner isolation, notes/position,
read status, trash/restore, failed deletion and retry, failed upload completion
and retry, full offline reload, explicit note-conflict review, cached-copy cleanup
on another device, and pause/resume at the acknowledged 6 MiB chunk offset.
Desktop/mobile screenshots are in ignored `test-results/pdf-library-*.png`.
Vendor assets are reproducible via `npm run vendor:pdf`; licenses are bundled.


### PDF backend activated — 2026-11-08

The connected Supabase plugin is installed but its tools remain absent from this
older session. Used the authenticated Chrome Supabase dashboard instead. Inspected
Reader Notes only: no prior Storage buckets or policies, PDF tables absent.
Installed pdf-library.sql successfully. Ran pdf-library-verify.sql on the live
database with rollback-only users/data; all checks passed. Verified bucket private,
25 MiB PDF-only limit, three Storage policies, zero fixture users remaining.
Anonymous reader_pdfs REST request returned 401. Feature flag enabled locally.
Organization free-plan egress warning observed (9.19 / 5 GB); billing unchanged.

### PDF release verified and published — 2026-11-08

Published the full feature in 1a38f11, then fixed a real Storage authentication
failure in 57b508f: XMLHttpRequest appended duplicate Authorization values when
TUS set the same header twice. Authorization is now set only in onBeforeRequest.
Added an exact single-header regression assertion; PDF browser tests pass.
Both Pages deployments succeeded. Live signed-in synthetic PDF upload, rendering,
local-cache removal, fresh authenticated cloud download, and Move to trash passed.
The synthetic file `Cloud PDF verification — safe to remove` remains in recoverable
Trash; no other user files were altered. Library search was cleared afterward.
Live SQL policies and tombstone tests passed and rolled back all fixture users.
The private bucket and feature are active. No billing settings were changed.

### Direct category items — 2026-11-08

Removed the generated My documents collection for cloud PDFs and explicitly
reassigned articles. Items without a collection now render directly beneath their
category; only real collections appear in the collection filter. Existing Studio
collections remain unchanged. No stored category assignments or PDF bytes changed.
Validated with 36 unit/database tests and the PDF browser suite, including direct
category rendering and the absence of a synthetic collection filter option.

### Free-plan PDF limits and device resources — 2026-11-08

Added supabase/pdf-free-plan.sql and installed it through the Reader Notes SQL
editor in project zkffujfbzbxoexohcmwk. Verified reader-pdfs remains private,
application/pdf only, with file_size_limit 52428800. Database size constraint now
matches 50 MiB. No subscription, billing, or access-policy changes.

Import offers cloud (50 MiB) and device-only (150 MiB) reading. Files above 50 MiB
automatically select device mode. Local/iCloud Drive/OneDrive files are chosen
through the native picker; they must be available/downloaded on the device.
Device mode never uploads its file, notes or new category. A browser copy is
optional; otherwise source reselection is required after reopening. Metadata,
notes, progress, categories and trash are browser/account scoped. Sign-out warns
before clearing device entries and notes, preserving existing study-backup flow.
Original source files are never modified. Blob range transport now lets PDF.js
read bounded slices instead of copying the full PDF into an array buffer.

Checks: 36 unit/database tests including 50 MiB boundary; existing article/account
browser suite; PDF browser suite with a sparse 125 MiB file. Large-file checks
cover range reads, source reselection, optional browser persistence, retained
notes, local categories, trash/restore/removal and no cloud record/object creation.
See PDF_LIBRARY.md for user choices and limits.

### iPad/Safari PDF startup compatibility — 2026-11-08

User reported Cannot access uninitialized variable on an iPad while opening
engineering_cybernetics_en_1954. Exact device failure was not reproduced in current
WebKit. Mozilla recommends its legacy build for Safari; replaced the modern
library/worker with matched 6.5.438 legacy builds at new .compat.mjs URLs. Both
include a small Promise.withResolvers fallback before PDF.js initializes, covering
older Safari API availability. New URLs plus SW cache bump avoid retaining failed
modern modules or mixing old worker caches. Assets remain reproducible through
vendor:pdf and retain Mozilla's license.

Moved viewer error handling around dynamic import/setup too, so initialization
failures clear Loading PDF and offer retry/download. Added focused PDF renderer
browser test (no cloud mocks): WebKit passes with newer page APIs disabled and
Promise.withResolvers/Iterator disabled in the worker. Covers canvas/text layer,
search/reopen and injected startup-error loading cleanup. All 36 unit/database
tests and full Chromium cloud/offline/125 MiB PDF workflow passed. Physical iPad
confirmation remains pending. No stored user files or cloud schema were changed.


### Study Studio PDF display — 2026-11-08

Adopted Mozilla's full continuous PDFViewer with the existing matched legacy
renderer/worker, bounded Blob ranges and Safari compatibility fallback. Reader
controls are grouped into Navigate, View, Panes & layout, Read aloud and Files.
Added fit width/page, actual size/presets, rotation, fullscreen (maximize fallback),
reading mode, collapsible notes, duplicate views and another-PDF comparison.
Each pane has independent search/navigation/zoom/rotation and a visible focus
indicator. Phone splits stack vertically. Notes and file actions target the
primary PDF; read aloud targets the active pane's selection or current page.
Scanned pages without searchable text require OCR. Speech uses browser voices.

Fractional scroll position, zoom and rotation are browser/account-scoped under
pdf-views; notes visibility and split direction under pdf-workspace. The primary
page number still synchronizes through existing PDF metadata. Sign-out clears
these local settings. Comparison shares the parsed document for duplicate views;
separate PDFs keep independent document lifecycles. No cloud schema, privacy,
storage limits or billing changes. Device-only sources retain existing behavior.

Validation: 36 unit/database tests, existing article/account browser suite, full
cloud/offline/125 MiB device workflow, and focused Chromium/WebKit renderer tests.
New checks cover duplicate independent rotation/zoom, restored view settings,
separate-file comparison, notes/reading mode, maximize/restore, split direction,
fractional continuous-scroll restoration and mocked browser speech controls.
WebKit checks disable newer page/worker APIs; physical iPad confirmation remains
pending. Browser speech output is mocked in automation, not audio-certified.


### Mixed-file workspace — 2026-11-08

Library → Open workspace, or PDF → Panes & layout → Add pane. Open up to four
panes from Library text articles/PDFs, or downloaded local/iCloud/OneDrive files.
Device sources appear in the Add pane saved-source list, not as cloud Library
imports. Formats: PDF; plain text TXT/MD/CSV/LOG; PNG/JPEG/GIF/WebP/AVIF/BMP;
video MP4/M4V/WebM/MOV/OGV when the browser supports their encoding. Markdown
and CSV display as plain text; text/HTML is never executed. No drive account
connection, media upload, Supabase migration or billing change.

MixedPanes manages additional panes alongside the original primary/comparison
PDFs, with a four-pane total. Three/four panes default to grid; beside/stacked
layouts remain selectable. Phones use file tabs with one active pane. Added
replace/close/maximize controls, primary replacement, per-file local notes,
text find/size/read-aloud, image fit/zoom/scroll/rotation and native video controls
plus playback speed. Video never autoplays. Position, text size, image rotation/
zoom, and video time/rate are restored independently from source metadata.
Library article text is read-only; workspace notes do not overwrite article notes.
Primary PDF actions stay labelled and disabled when a mixed pane has focus.

Device limits: text 10 MiB, images 50 MiB, PDFs 150 MiB, videos 500 MiB. Optional
browser copies are limited to 150 MiB and storage availability. Without a copy,
reselect the original file; a bounded sample fingerprint checks identity and
retains notes/view settings. Some WebKit environments cannot persist Blob/File
objects; saved copies fall back to 4 MiB ArrayBuffer chunks in the asset record.
Object URLs are revoked and video/rendering resources released on pane close.
Forget saved device source removes its local notes/settings/browser copy, leaving
the original file untouched. Workspace notes are not included in article backup.

Records/notes/settings: mixed-sources:${scope}. Bytes: scoped mixed-file:${id}
assets. Account sign-out warns about device sources/notes, flushes/closes panes,
and clears the matching settings/assets. Other account scopes are unaffected.
Service worker shell 0.12.0 includes mixed-panes.js and media-viewer.js.

Validation: all 36 unit/database tests, existing article/account browser suite,
cloud PDF/offline/125 MiB workflow, Safari compatibility PDF suite, and the new
mixed-pane suite in Chromium and WebKit. Mixed tests cover inert multilingual
text, image rotation, real generated H.264 video metadata/seek/rate, four panes,
maximize/restore, phone tabs, copies/reselection/reopen, per-source notes, Library
article isolation, primary replacement, Forget cleanup and account isolation.
Physical iPad and all possible video encodings remain unverified.


### Per-article saved reading workspaces — 2026-11-08

Closing an article/workspace now saves its arrangement on this browser, per
account and anchor article/PDF/device source. Reopening the same Library PDF or
an article previously used as a mixed-workspace anchor restores companion order,
individual view states, comparison/duplicate PDFs, layout, active/maximized pane,
notes visibility and reading mode. Videos restore time/rate and remain paused.
Explicit companion close removes it from the saved arrangement; closing the
anchor preserves the whole workspace. Reset workspace retains the anchor and
clears companions/layout. Resume workspace reopens the last saved anchor from
the Library. Restored text articles offer Edit article to reach the editor.

Unavailable local files retain labelled placeholders, per-file notes and slot
positions. Select source file revalidates the original before replacing the
placeholder; Retry opening retries Library/cached resources. Deleted/inaccessible
Library resources are not resurrected. Forget saved source also removes saved
workspace references. Sources without browser copies still need reselection
after a reload; closing/reopening in the same session can reuse File references.

ReadingWorkspace stores reading-workspaces:${scope}; it contains descriptors and
view/layout state, not file bytes or additional copies of notes. Additional
panes have stable slots and independent view states, even for duplicate sources.
Snapshots save during reading and before teardown, with restoration/account
change guards. Sign-out flushes/closes before scoped cleanup; other accounts are
unaffected. Existing single-file reading positions and cloud notes remain intact.
No Supabase schema, storage policy, limit or billing changes.

browser-files.js shares the existing portable Blob/4 MiB byte-chunk fallback
between device PDFs and mixed media, so Safari can retain a primary PDF browser
copy as well. Existing Blob assets remain compatible. Service worker shell
0.13.0 includes both new modules; deployment copies them with the app.

Validation: 36 unit/database tests; article/account browser suite; complete cloud
PDF/offline/125 MiB workflow; Safari PDF renderer/compatibility suite; mixed-media
suite; and new reading-workspace suite in Chromium and WebKit. New checks cover
PDF/article anchors, companions on close/reload, missing bytes and wrong/right
reselection, image rotation/notes, paused video time/rate, duplicate comparison
state, explicit removal, Reset, anchor-close preservation, Edit article, Resume
and scoped cleanup. Physical iPad testing remains pending.


### From Links import — 2026-11-09

Implemented the supplied docs/plans/reader_notes_import_ai_feature_spec.md's
priority link-import slice. Library Import links opens a responsive batch URL
screen with destination category/new category, tags, duplicate review/skip,
server-streamed stages, recoverable per-row errors/retry and reader actions.
PDF/TXT/MD/simple HTML only; no AI, OCR, DOCX/EPUB or cloud-drive authorization.
PDFs retain original bytes privately; text/articles normalize into existing
editable documents. Source attribution is cached per account and shown in readers.

Added supabase/link-import.sql, live rollback verification, and reader-import-link
Edge Function with authenticated owner APIs, source SHA deduplication and limits.
Server DNS checks all resolved addresses and pins the connection to a public IP,
validates redirect destinations/robots policies, retains TLS host verification,
and bounds bodies/decompression/time. No user auth/cookies reach source sites.
Limits: 20 MiB PDFs, 2 MiB text, 10 links/minute and 100/day/account. Existing
storage policies, billing/plan and the private reader-pdfs bucket are unchanged.

Installed in zkffujfbzbxoexohcmwk only through the existing authenticated Dashboard.
Read-only policy checks and live owner/anonymous/duplicate rollback verification
passed; fixture users left: 0. Downloaded deployed source matches the esbuild
bundle after newline normalization. Function boots and returns its own 401 for
unauthenticated requests. Existing article/account, cloud/offline/125 MiB PDF and
WebKit saved-workspace suites passed, as did new batch import browser tests.
Full signed-in live import smoke testing follows the Pages deployment.

Dashboard reports existing org prior-cycle quota overrun; possible restrictions
from 2026-12-08 if unresolved. No billing change was made. See
 docs/plans/link-import-implementation.md for scope, limits and reproduction.


Live From Links follow-up: real example.com HTML and W3C dummy PDF imports
succeeded in the signed-in production app; a private loopback URL was rejected
without stopping the batch. The hosted Edge runtime lacks global Buffer, so
handler/transport now import node:buffer explicitly; the correction is deployed.
A Deno subprocess regression test disables global Buffer. Reader-opening smoke
also exposed an unrelated full-library/archive statement timeout; import refresh
now fetches only resulting text IDs and PDF/category metadata, preserving local
edits through mergeRemote and avoiding archive synchronization. Browser tests
assert no broad document listing is triggered by importing/opening results.
