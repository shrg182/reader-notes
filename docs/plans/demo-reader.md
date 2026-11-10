# Demo Reader — private, read-only book access

Recorded November 10, 2026. A separate invited account can browse an approved
snapshot of the owner's current active text editions and read specifically granted
cloud PDFs. No administrator role or owner credentials are shared.

## Access boundary

- Text snapshots contain title, language, readable body and grouping metadata.
  App-private notes, rich editing/annotation state, history and reading progress
  are not copied. Text already authored in the readable body is part of the book.
- Only existing ready, active cloud PDFs are granted. Their bytes remain in the
  private bucket; no duplicate PDF upload or public bucket is created.
- Embedded PDF annotations remain inside the file. Reading access necessarily
  allows saving/copying content; downloaded material cannot be recalled.
- Future uploads and later text edits are not automatically shared. Deleted or
  trashed original items disappear from subsequent catalog reads. Private device
  files and Trash are excluded.
- Snapshots are owner/viewer/document scoped. The viewer cannot query the source
  private document/PDF tables or write/delete the owner's files.

## User experience

An otherwise empty invited account opens Demo Library by default. A separate
Demo Library button offers search and category/collection browsing. Text uses an
inert read-only display; PDFs use the existing viewer with independent page,
search, zoom and rotation controls. These shared source views do not offer edits,
private owner notes, deletion or organization of the owner's books. My Library
remains available for the demo user's own separate work.

This first demo is a readable catalog, not a clone of the owner's full annotated
editing environment or local companion workspaces.

My Account → Manage Demo access lets an owner list grants and revoke access.
Revocation prevents subsequent authorized reads but cannot remove downloaded
copies. A currently open downloaded PDF/text can remain in browser memory.
Snapshot files are not added to application offline caches or private backups.

## Account setup

Use an administrator-issued invitation for the user-provided email. The recipient
chooses their password through the application's invitation callback; never put
passwords, email verification tokens, or service-role credentials in code, logs
or this document. Use a separate browser profile/private window when accepting
the invitation to avoid switching the owner's existing browser session.

## Backend and release

Install supabase/demo-library.sql only in zkffujfbzbxoexohcmwk. Installation alone
does not grant any books. The owner must explicitly authorize and execute
reader_grant_demo(viewer UUID). Keep demoLibraryEnabled false until installation
and access verification pass. Only one SELECT Storage policy is added, gated by
an exact owner/viewer/file grant and a current ready, non-trashed PDF. Existing
owner policies and the private bucket remain in force. Anonymous access is denied.

reader_demo_catalog returns only granted snapshot fields; direct table access is
revoked. reader_demo_grants lists the caller's outgoing grants, and
reader_revoke_demo affects only the caller's grants. No billing/plan upgrade,
OpenAI integration or anonymous/public library is included.

Recipient/account identifiers and activation scripts are kept in ignored
private-migrations/, not the public repository. Activation checks the reviewed
counts in the same transaction and aborts if the source scope changes.

## Verification

54 unit/database tests passed at preparation. New checks cover chosen-viewer
isolation, no private note/rich-state/progress fields, no future uploads, anonymous
denial, blocked source writes/deletes, owner preservation and revocation.
Browser checks cover invited-account landing, grouped/searchable read-only text,
inert HTML-like text, actual PDF navigation, refresh/revocation and zero owner
writes. Existing account/article tests also cover invitation password setup,
confirmation/recovery, conflicts and isolation.

## Live activation checkpoint

The owner approved 518 active text editions and 6 ready cloud PDFs. Migration and
the guarded owner grant installed atomically in the Reader Notes project. Live
recipient-role queries returned those exact counts, zero private document/PDF
metadata rows, six readable PDF objects, no direct snapshot-table SELECT and no
anonymous catalog execution. Invitation exists pending recipient verification;
actual credential setup and login are performed by the recipient.

Enabled frontend fb02fff deployed successfully; live config matches. Owner-side
Manage Demo access was verified in the actual signed-in app and shows 518 text
editions / 6 PDFs with Revoke access. No real recipient login was attempted; the
recipient must verify their invitation and set their own password.
