# Private cloud PDF library

## Setup

Target: existing Reader Notes project `zkffujfbzbxoexohcmwk` only.

1. Apply `supabase/pdf-library.sql` using an authenticated Supabase connection.
   This is an additive, transactional migration. It creates three owner-only
   tables, four RPCs, the private `reader-pdfs` bucket and its policies. It does
   not modify or migrate existing articles or device-only reference PDFs.
2. Confirm the bucket is private, its MIME type is `application/pdf`, and its
   25 MiB limit is allowed by the project's global storage limit. Check existing
   Storage policies for broad grants that could override the bucket's policies.
3. Verify anonymous reads/writes are denied and test with two disposable accounts:
   A can upload/read/trash/restore/remove its PDF; B cannot read or change it.
   Confirm a browser reload and a second browser can read the same cloud PDF.
4. Set `pdfLibraryEnabled: true` in `config.js` and publish. Keep it false until
   the migration is installed. No secret/service key belongs in this app.

The migration is executed against PostgreSQL in `tests/pdf-library.test.mjs`,
with a minimal Storage-schema fixture. Browser tests exercise actual PDF.js and
TUS against a mocked cloud API. These do not substitute for a live Storage test.

## User flow

Library → Import PDF → choose a file → title → existing or new category → Import.
The file picker exposes local or cloud-drive locations supported by the device;
there is no separate iCloud or OneDrive authorization in Reader Notes.

Uploads are limited to 25 MiB. A reserved library item remains `uploading` until
Storage confirms the object and its expected size. TUS sends 6 MiB chunks and
retains the upload address in account-scoped IndexedDB. Pause keeps the file and
checkpoint; Resume upload uses the saved copy or requests the same file, verified
by SHA-256. Expired upload addresses restart safely. Failed finalization can be
retried without re-uploading an object that is already present.

A successful import opens the PDF.js reader. Controls include pages, zoom,
text search, selectable text, private notes, reading position, Mark as read,
Download PDF, Remove offline copy and Move to trash. Scanned image-only PDFs
need OCR before text search works; extraction into editable articles is separate.
Encrypted PDFs prompt for their password, which is not stored.

Details & category renames or moves the PDF. New categories sync to the account
and can also be assigned to synced text articles using their Library Category
button. Existing Studio categories and collection membership remain intact unless
an article is explicitly reassigned. PDFs and reassigned articles appear directly under the selected category. Category moves never move stored PDF bytes.

## Deletion and offline behavior

- Mark as read changes reading status, without deleting the file.
- Move to trash hides the PDF from the active Library across devices. A ready
  PDF can be restored from Filters → Show trash.
- Delete permanently is available only in Trash, after an explicit confirmation.
  It marks the item `deleting`, removes the binary through the Storage API, then
  clears the filename, title, notes, reading position and content hash. A minimal
  tombstone remains to reject stale restore attempts. An interrupted removal is
  shown as Retry permanent deletion; it is never shown as successful prematurely.
- Never delete Storage metadata directly using SQL. That does not delete the
  underlying object. The application uses the Storage API for that operation.
- Remove offline copy deletes only this device's cached bytes. The cloud file
  stays available, and the current open page lasts until the user leaves.

Cached PDF bytes and metadata are account-scoped. Previously opened PDFs can be
read offline. Notes and position queue locally and sync after reconnection.
Revision conflicts retain the device draft and require choosing the cloud or
local version. Trashing does not purge notes; permanent deletion does. Other
devices clear cached bytes and drafts for a deleted file on their next sync;
offline devices cannot be remotely erased while disconnected.

The existing JSON article backup does not include cloud PDFs or their PDF-specific
notes. Download PDF saves the original binary. Account sign-out clears account
caches but blocks while uploads or unsynchronized PDF drafts remain. The existing
device-only reference PDF attachment continues to work separately.

## Assets and tests

PDF.js 6.5.438 and tus-js-client 4.3.1 are vendored with their licenses. Run
`npm ci && npm run vendor:pdf` to reproduce the browser assets. The viewer
renders pages and text only; PDF JavaScript is not executed and evaluation is
disabled. PDFs are downloaded using the signed-in account's Authorization header;
no public or permanent download URLs are persisted in records.

Checks: `npm test`, `npm run test:pdf-browser`, `npm run test:browser`, and
`node tests/rich-browser.cjs` with the environment's Playwright path when needed.

## Live activation — 2026-11-08

Installed in project `zkffujfbzbxoexohcmwk` through the authenticated Supabase
dashboard. Before installation, Storage had no buckets or object policies.
`pdf-library-verify.sql` passed on the live database with rollback-only fixtures:
owner binding, cross-account and anonymous denial, incomplete-upload rejection,
direct-write denial and tombstone protection. Result: private bucket, 26,214,400
byte limit, application/pdf, three Storage policies, zero fixture users left.
An anonymous REST probe of reader_pdfs returned HTTP 401.

The organization dashboard reported free-plan egress above its allowance
(9.19 GB / 5 GB). No subscription or billing settings were changed.

Live browser verification also passed in the signed-in Reader Notes account:
imported a synthetic one-page PDF, rendered it with PDF.js, removed its local
cached bytes, and reopened it through an authenticated Storage download. The
synthetic `Cloud PDF verification — safe to remove` file was moved to recoverable
Trash afterward. It was not permanently deleted.

The first live TUS request revealed duplicate Authorization header values caused
by setting the same header in both initial options and onBeforeRequest. Removed
the initial value so the refreshed user token is set once per request. The PDF
browser suite now asserts a single exact Authorization value; the fixed upload
and cloud download both passed live. Published code includes this correction.
