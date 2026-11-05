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
