# Article placement and original source — 2026-11-10

Library Move / Organize chooses category, real collection/subcategory, and end,
before or after an existing article. It supports existing taxonomy collections
(including guwen_guanzhi / 《古文观止》) and a new collection name. Category/collection
changes do not change content, rich state, notes, reading positions or workspace
IDs. Source/saved editions sharing one canonical article identity move together.
Existing natural chapter order is preserved for untouched articles. Relative
placements resolve against all edition IDs; a missing/moved anchor falls back
to the end. Stale moves/cycles are rejected by the owner-only server RPC.

Link import offers the same collection/position controls and a suggestion for
known book names/sites. Suggestions require user selection. Successful result
rows also offer Move / Organize. Placement is a separate real save after import;
if it fails, the document remains available, and Retry retries the placement
without downloading/replacing the content. Duplicate imports never silently
reorganize existing entries. A retry matching an already-committed placement
is accepted as idempotent.

Owner-only reader_library_placements is installed by supabase/library-organize.sql.
It includes independent placement revisions; the RPC serializes owner placement
changes, validates all owned editions, and rejects stale/cyclic/self references.
Text moves update existing category assignments only. PDF moves use the existing
revision-aware update RPC and preserve PDF notes/progress. Device PDF placement
stays account/browser scoped. New empty custom collections are not separately
stored; they exist through their assigned articles. Categories/collections are
metadata, never filesystem moves or renames.

Cached placements: library-placements:${scope}, cleared at sign-out and reset
before account changes. Cloud results refresh on account load and library sync.
Existing PDF Details & category remains usable; a category mismatch suppresses
old collection placement until the item is organized again. Unsynced new cloud
articles require Save & sync before organization; unavailable/device-only
references are excluded from cloud anchor choices.

Original source: hydrateRich passes the imported original URL into RichEditor
seed. A valid pre-existing rich/source-package URL takes precedence; a blank or
unsafe source URL falls back to validated import metadata. This backfills old
imports at read time without rewriting their text/annotations. The 原文来源 card
shows the full link and a generic 打开原文 action. Script, file and credential URLs
are rejected. Existing iframe isolation and reviewed external-link navigation
remain intact. The header attribution link remains available as well.

Validation: 49 unit/database tests, dedicated organizer browser checks (move,
order, reload, new collections, import placement, source-card fallback with ruby
and notes intact), existing article/account and rich editor regression suites.
Live migration and rollback-only owner/anonymous/cycle/content-preservation
verification passed: zero retained fixture users; RLS enabled; anonymous denied.
Only Supabase project zkffujfbzbxoexohcmwk was changed. No billing or storage
policy change; no Edge Function redeployment is needed for this increment.
