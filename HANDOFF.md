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
