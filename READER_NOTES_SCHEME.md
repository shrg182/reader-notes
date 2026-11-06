# Reader Notes · 阅读札记 — development scheme

Date: 2026-11-05 (America/Detroit)

## Product direction

Product name: **Reader Notes · 阅读札记**. Project name: `reader-notes`.
Tagline: *Your personal reading and editing workspace.*
The existing Reader Studio / Study Studio retains its identity. The new name
emphasizes personal reading records and avoids confusion between the apps.

Build a separate successor to Study Studio, combining its reading and editing
workspace with Daymark Calendar's private accounts and revision-aware database
synchronization. Keep the existing applications and their data intact.

The primary workflow is: import an article and its reference PDF on a desktop,
edit and annotate it, reopen it on another device, work offline, synchronize,
and recover an earlier edition. Desktop and tablet favor side-by-side reading;
phones use a single usable column.

## Existing projects consulted

- `../automate_study_practices/HANDOFF.md`: Study Studio's editor/PDF panes,
  formatting, notes, vocabulary, review, histories, and portable backups.
- `../health-calendar/README.md` and `supabase/schema.sql`: Supabase accounts,
  account-scoped device storage, revision checks, and conflict review.
- `../reader_app/README.md`: earlier Personal Reader's EPUB, private libraries,
  progress, study records, and backup/restore patterns.

These are references, not dependencies. Existing browser drafts are not read or
uploaded automatically. Historical public-export permission for Study Studio
does not make this new app's libraries public.

## Features to inherit

| Area | Target behavior |
| --- | --- |
| Workspace | Editable edition and original PDF; resize, focus, restore positions |
| Editing | Undo/redo, highlights, colored underlines, strike, clean/annotated view |
| Study | Footnotes, ruby/pronunciation, inline notes, comments, verification marks |
| Language | Vocabulary, difficulty colors, dictionary, read-aloud |
| Library | Collections, multilingual search, chapter navigation, metadata |
| Review | Search notes across books; jump back to their original passages |
| Recovery | Version history, trash, validated backups, preview before import |
| Export | JSON, readable text/HTML, printable edited edition with notes |
| Devices | Desktop/tablet panes, phone layout, installation, selected offline books |

Feature parity is tracked explicitly; not every legacy editor implements every
feature, and the initial foundation is not a claim of full parity.

## Accounts and ownership

- Email/password accounts, email confirmation, remembered sessions, password
  recovery, and concurrent devices.
- Supabase Auth identifies users. PostgreSQL ownership rules enforce private
  records; private Storage policies enforce file ownership separately.
- Prefer a separate reader Supabase project. A shared login with Daymark remains
  a later explicit decision; no calendar credentials or configuration are copied.
- Signed-out local mode is a shared notebook for that browser profile, not a
  private account. Account caches use separate namespaces. Local records are
  never silently assigned to a signed-in account.
- No service-role key belongs in the frontend. Use only the project URL and
  publishable/anonymous client key there.

## Data model

Use permanent UUIDs rather than filenames or URLs as record identities.

| Entity | Purpose |
| --- | --- |
| Book | Owner, title, language, format, source metadata, collection membership |
| Chapter | Editable content, stable ID, ordering, current revision |
| Source asset | Original file, hash, MIME type, size, private storage path |
| Annotation | Chapter, selected quote/context, anchor, type, text, revision |
| Vocabulary | Word, language, definition, context, source reference |
| Edition revision | Immutable previous content and recovery metadata |
| Reading position | User/book/chapter position, device, timestamp |
| Preferences | User defaults and book-specific overrides |

Foundation simplification: each imported article is one book with one editable
chapter. Its text and reading notes form one revisioned document. Separate
chapter/annotation records are introduced before advanced rich editing; do not
use a single whole-library blob as the long-term storage model.

Keep original sources, editable editions, and study records distinct. Original
PDF bytes must not change when an edition is edited. Future annotations retain
quote/context and chapter references; lost anchors are flagged for reattachment
instead of being silently discarded. PDF annotations need page coordinates and
a separate anchoring model.

## Saving and synchronization

### Independent audiences (preview 0.4)

Books and individual contributions have separate Private / Selected groups /
Public audiences. Private working records remain separate from deliberately
published snapshots. Shared sources exclude the private notes field; each note,
pinyin mark, annotation, footnote or revised edition is independently owned.
Readers see only contributions permitted by both their own audience and the
source audience. Private drafts never inherit public visibility from a book.

The current implementation includes reviewed text publication, private drafts,
passage-linked contribution layers, alternative editions and organizer/member
groups. Live activation is gated on configured Supabase and verified policies.
See `SHARING.md`; it is not enabled by deploying the frontend alone. Dictionary
visibility/scope/specialty/difficulty remain separate future dimensions rather
than being collapsed into a single category.

1. Persist a draft in IndexedDB before showing device-save success.
2. Maintain an account-specific queue; synchronize on explicit Save & sync,
   reconnection, and periodic retry while the app is open.
3. Send the last known server revision. An atomic database function checks it,
   creates a revision, and rejects stale writes without replacing cloud data.
4. Preserve local and cloud content on conflict. Let the reader choose the cloud
   version or explicitly replace that reviewed version with the local draft.
5. Record deletions with tombstones so stale devices cannot resurrect records.
6. Retain bounded local history and server edition history. Restoration creates
   a new revision rather than rewriting history.
7. Distinguish unsaved editor changes, saved device drafts, cloud success, and
   unresolved conflicts. Never describe an offline save as synchronized.

Default conflict policy preserves both versions for review. Optional iMac
priority may be added later; it must never silently remove the losing version.
Reading positions and display preferences can eventually use lighter conflict
policies; editable text and study notes require revision checks.

Offline access covers cached records and explicitly retained source files, not
an arbitrary book that has never been downloaded. Browser storage can be cleared;
synchronization and independent downloadable backups are different safeguards.

## Interface

- Library: search, import, create, open, trash, export, account/settings.
- Workspace: compact header, clear save status, article editor, reading notes,
  separate original PDF pane, and revision recovery.
- Account: sign up, sign in, recovery, sign out, connection status.
- Later: review dashboard, collections, expandable tool groups, toolbar presets,
  pane resizing and saved layouts, and scoped preferences.
- Preserve accessible labels, keyboard operation, visible focus, and readable
  controls. Avoid technical implementation text in everyday workflows.

### Modular toolbar implementation (preview 0.2)

Six standard blocks now cover Navigate, View, Panes & layout, Dictionary &
vocabulary, Read aloud, and Files & recovery. All blocks support visibility,
expansion and pinning. Preferences inherit by article → format → user defaults
→ built-in defaults, with separate device-local phone/desktop profiles. Reading
mode hides and restores the tool blocks. Article/PDF adapters govern supported
actions; later formats will add adapters to the same system.

Dictionaries are tools within their own block. Current lookup opens explicitly
chosen external providers; personal vocabulary stores definitions, context,
language and notes separately from article text. Device vocabulary is included
in backups. Cloud synchronization of vocabulary and toolbar preferences is not
yet implemented. Rich editing and annotation blocks will be registered only
when their underlying document capabilities are ready.

## Delivery stages and completion criteria

### 1 — Foundation (current implementation)

- Local library, TXT/Markdown-as-text imports, create/edit/save, source PDF view.
- IndexedDB drafts, per-account storage, local history, trash, validated JSON
  backup/restore, and device/cloud save indicators.
- Configurable Supabase email/password account integration, recovery link flow,
  database migration, owner isolation, atomic revision checks, conflict review.
- Verify local workflows and mocked account/cloud behavior in browsers. Verify
  real SQL and real accounts separately when a project is configured.
- This stage does not include rich Markdown rendering or source PDF cloud upload.

### 2 — Main reading/editor workspace

- Structured rich-text editor, stable chapter/annotation IDs, sanitization,
  anchoring and undo/redo; formatting, vocabulary, notes and revision comparison.
- Private PDF uploads, integrity metadata, download queue, storage policies,
  upload rollback and cleanup; independent source and edition export.
- Tablet panes, phone focus controls, progress restoration and search.

### 3 — Migration

Preview 0.3 now provides the inventory/preview workbench and device-retained
original archives, plus small explicitly acknowledged plain-text trials. See
`MIGRATION.md`. This does not complete the full-fidelity stage below.

- Inventory legacy formats: news, classical text editors, PDF notes, vocabulary,
  histories, workspace preferences and private writing.
- Build version-specific adapters. Preview destination, counts, duplicates,
  unsupported fields and conflicts before importing.
- Preserve originals and a machine-readable import report. Repeated imports
  must not multiply records. Test representative exports before bulk migration.
- Portable backups remain available throughout the transition.

### 4 — Reading parity and offline installation

- EPUB and its navigation/assets, advanced panes, read-aloud, dictionaries,
  cross-book review, collections and comprehensive export.
- Installable app, selected offline downloads, storage-use controls and guarded
  update activation that preserves pending changes.
- Real iPhone/iPad checks, cross-device conflict/recovery exercise, and measured
  large-library performance before replacing the old Studio.

## Validation and release gates

- Unit checks for backup validation, merge decisions, and input constraints.
- Browser checks for draft persistence, imports, restore, trash, account cache
  separation, offline retry, stale revisions, conflicts and mobile layout.
- Database checks with authenticated accounts A and B, denied anonymous writes,
  owner-bound RPCs, concurrent writes and revision history.
- When private files ship, test file policies independently of table policies.
- Never call mocked cloud tests proof of live Supabase security.
- Do not deploy, import private legacy data, or run migrations against an
  existing project as a side effect of local development.

## Current limitations and external setup

This workspace starts without a configured reader Supabase project. Local
development can proceed independently. Live account creation and cloud sync
require the user-owned project URL/client key and installation of the included
migration in that project. Public hosting, production email delivery, real SQL
security verification, and real-device testing remain release work.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/auth/passwords

## Accepted interface direction — version 0.6

The user selected Study Studio's interface and editor as the Reader Notes
foundation. The shared editor/workspace implementation is adapted directly and
connected to account storage. Rich annotation state is retained per document with
revision history; the plaintext projection remains a separate sharing boundary.
Details and remaining format-specific limits are in `STUDIO_EDITOR.md`.


## Study Studio catalog parity (0.7)

The library uses a compact full-width search, category descriptions, collapsible collections and numbered article rows. Import, migration inspection and backup operations are in Library tools. Shared library, reading groups and synchronization remain directly accessible.

One article row groups independent source and saved editions under Editions. Stable source paths and original catalog keys identify articles; titles never determine identity. Historical Jianshang chapter versions share a chapter identity, while distinct personal entry IDs remain separate. Every edition stays intact and independently editable/shareable. Open editor prefers a saved edition when available. Counts distinguish articles from editions; collection ordering follows the existing taxonomy and numeric source paths.

Imported reading counts, last-read dates and editing activity come from the preserved Studio study records. Missing history says Not recorded. New editor visits are saved per account on this browser and added to imported counts; these new counts are device-local and are not synchronized or included in article backups. No missing historical dates are invented. Library history caches reset when imported study record fingerprints change and remain isolated by account.

PDF actions appear only when a corresponding binary is actually attached on this device. References to missing legacy PDF files do not produce working-file buttons. Private saved text, notes, archives and reading histories are never part of the published app assets; the static identity map contains only public Studio catalog keys and paths.
