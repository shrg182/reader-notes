# Study Studio editor inheritance — Reader Notes 0.6

Reader Notes now uses an adapted copy of Study Studio's reusable editor and
workspace code, rather than a textarea as its default editing interface.
`tools/adapt_studio_editor.py` records the extraction from the original project.
The generated static files contain trusted interface/code only, with all article
content, original global dictionaries and embedded browser defaults removed.
The existing Study Studio files remain untouched.

## Editing and interface

The inherited workspace includes the compact toolbar, paper-like content pane,
All Notes sidebar, reading/Sheets/original themes, night mode, typography controls,
pane balancing, immersion, bottom navigation and toolbar collapse. Reader Notes
supplies account, collection, sharing, synchronization, backup and installation
commands. Additional Reader Notes tools remain available through **Tools**.

The editor retains rich content, undo/redo, bold/highlights/colored underlines,
format clearing, ruby/pinyin, interlinear notes, linked footnotes, editorial
comments, review marks, inline images, annotation media, term dictionaries and
difficulty hints, read-aloud/voice/rate/cursor controls, search, private reading
notes, note recovery, edit logs, PDF printing and text/HTML/JSON/CSV exports.
Browser speech and print capabilities remain browser-dependent.

English/Russian/Chinese content is Unicode-preserved. Document language is taken
from account metadata or the original HTML. Paginated imported text is retained
in page-labelled sections. The common editor is used across formats; this is not
a claim that every book-specific original application or EPUB/PDF binary editor
has been ported. Missing original binaries remain outside this upgrade.

Private dictionary correction changes are merged across the account’s working
editions by per-term edit time; reset markers restore base definitions. The imported
dictionary search uses the same private correction layer.

## Existing editions and recovery

Opening a migrated source restores its rich HTML and source footnotes from the
preserved original data. The Rongzhai example restores all ten linked footnotes
and ruby pronunciations. Saved editions use their separately preserved state.
If the working plaintext has newer edits, it takes priority and is kept editable;
the preserved annotated original remains available separately. A first rich save
keeps the previous working edition in recovery history.

`reader_documents.rich_state` stores a versioned structured edition as text so
legacy NUL-separated annotation identities survive. The owner-bound
`save_reader_rich_document` RPC uses the existing revision check and stores the
rich edition in the same immutable revision snapshot. Stale writes become
conflicts. Older plaintext clients cannot leave an obsolete rich state active;
the previous rich revision remains recoverable. Account backups and restores
preserve structured editions. Media stays with its rich edition (the inherited
2 MB image, 10 MB video and 25 MB total attachment limits apply).

## Account and privacy boundary

The editor runs in a sandbox without same-origin permission, with temporary
in-memory storage instead of shared browser storage. Only trusted editor code
receives script nonces; imported HTML is sanitized and cannot execute scripts or
load remote images. The frame receives the current document only, never account
access/refresh tokens. The host validates the frame, per-open nonce, scope and
current document before accepting edits. Closing/signing out clears the frame.

Rich notes, pinyin and footnotes remain private working data. Existing public/group
sharing still requires explicit reviewed publication; the plain source snapshot
excludes rich/private annotation state. Independently shared contributions remain
available through Reader Notes' existing sharing controls.

The service worker caches static app/editor assets only. Previously opened
working editions and their media can reopen offline; queued edits synchronize
when online. Imported originals need one online preparation first. Cached private
preservation payloads are account-scoped and removed on sign-out. Installation is
requested explicitly through the browser; no browser credential is copied.

## Verification

- SQL/model tests cover revision conflicts, owner isolation, denied anonymous
  calls, NUL keys, rich history, backups and legacy plaintext updates.
- Browser checks cover the exact Rongzhai seed, ten editable/linked footnotes,
  ruby, private notes, undo/redo, save/reopen, offline reopening, desktop/mobile
  layouts and blocked malicious HTML.
- A separate two-device browser simulation checks structured account saves,
  reopening on another device, private notes and media retention.
- Existing library, migration, backup, conflict and sharing checks remain in place.

On 2026-11-05 the user installed `supabase/rich-editor.sql` and reported success.
Live anonymous checks confirm the rich-save RPC and rich column exist and deny
anonymous access. Native computer control was unavailable during this upgrade;
authenticated production save/reopen must therefore be confirmed in the user's
browser after publication. No real password or account token was collected.
