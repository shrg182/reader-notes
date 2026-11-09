# From Links — implementation, 2026-11-09

The supplied specification remains a proposed wider product. This increment is
From Links only; it preserves the current framework, Library and readers.

## Behavior

Library → Import links. Sign in, paste up to 10 public HTTP(S) URLs, choose an
existing/new category, optional tags, and duplicate review/skip behavior. Actual
server stages are streamed as NDJSON: Fetching, Extracting, Saving, Uploading
(PDF only), Ready/Duplicate, or Failed. No percentage is invented. Invalid rows
and repeated batch URLs do not stop valid imports. Failed URLs can be retried.
Cancel stops remaining work and aborts the request; an already completed server
import can remain in Library. Content hashes and stable pending IDs make retry
idempotent, including interrupted PDF upload/finalization. Duplicates preserve
existing text, category, edits and notes; the UI offers Open existing.

PDFs retain original bytes in the existing private reader-pdfs bucket. TXT/MD
and simple HTML articles become editable reader_documents. HTML scripts, UI,
forms and navigation are excluded; parsed HTML is never executed or inserted
into the browser. UTF-8 English/Chinese/Russian text is supported. Original HTML
and text downloads are not separately archived. Source/final URL, title, detected
MIME, filename, raw byte count, SHA-256 and tags are retained in owner-only
reader_link_sources; attribution links appear in text/PDF readers. Tags are
stored/displayed metadata, not a new Library filter.

## Limits and exclusions

20 MiB per PDF link; 2 MiB per text/HTML download; one million article characters;
10 attempted imports/minute and 100/day per authenticated account. Retrieval has
a 35-second deadline, 5-second DNS deadline, bounded headers/body/decompression,
and at most four followed redirects. Local file import and its larger limits
remain available. No EPUB/DOCX, OCR, conversion, AI calls, drive authorization,
paywall/login bypass, or paid plan change is included. Catalog pages are HTML
articles, not implied ebook downloads. Very complex or script-rendered pages
may need browser download/manual file import.

## Security and architecture

- Supabase project zkffujfbzbxoexohcmwk only; no service-role key in browser/code.
- Function validates bearer tokens with Supabase Auth before external retrieval.
- Private, loopback, link-local, multicast, reserved, mapped and transitional
  addresses are rejected; *all* DNS answers must be public. Every redirect is
  revalidated. The HTTP transport connects to the checked IP, while retaining
  the original Host/SNI and TLS certificate verification, preventing DNS rebinding.
- No user cookies/tokens reach source websites. Standard HTTP(S) ports only,
  no credentials in URLs, no HTTPS downgrade. robots.txt is checked before each
  document destination; inaccessible/disallowing robots policies fail closed.
- owner-only SQL RPCs perform atomic text creation/category assignment,
  per-owner SHA deduplication, resumable PDF reservation and completion. No
  existing document or PDF policies are loosened. No public PDF URLs are stored.
- Pending metadata is never treated as a successful import. Interrupted upload
  retries inspect an existing object and never overwrite its bytes.
- Per-account cached attribution is cleared at sign-out; queued URLs and fields
  are reset when accounts change.

## Reproduction and deployment

`npm ci`, `npm run build:link-function`, `npm test`, `npm run test:link-browser`.
The build bundles maintained server modules into
supabase/functions/reader-import-link.bundle.ts for Dashboard deployment. esbuild,
linkedom and ipaddr.js are build/server dependencies, not client API services.
Deno is installed as an official npm runtime package for compatibility checks.
The bundle retains dependency license comments.

1. Inspect project tables/storage policies, then apply supabase/link-import.sql.
2. Deploy the bundled index.ts as reader-import-link. Runtime environment uses
   Supabase's existing project URL/public key, with a hard project URL guard.
3. Run supabase/link-import-verify.sql; its fixture users/documents roll back.
4. Confirm anonymous calls are denied and run authenticated text/PDF smoke tests.
5. Enable linkImportEnabled and publish the existing GitHub Pages app.

## Verification checkpoint

44 unit/database tests passed, including URL/IP/DNS/redirect/robots boundaries,
content detection, inert multilingual extraction, authentic progress, per-owner
SQL/RPC isolation, immutable duplicate handling, incomplete PDF rejection and
rate limits. Browser tests cover mixed valid/invalid URLs, categories/tags,
partial failure/retry, duplicates/notes, opening text and PDF, attribution and
phone layout. Existing article/account browser regression suite passed.

The function was deployed through the Reader Notes Dashboard; its downloaded
source matches the reproducible bundle after trailing-newline normalization.
The deployed runtime returns its own unauthenticated 401 response. Migration and
live rollback-only owner/anonymous/duplicate verification passed; no fixture
users remain and reader-pdfs remains private. Full authenticated smoke testing
is the next deployment check.

Dashboard also reports the existing organization exceeded a prior-cycle quota,
with restrictions possible from 2026-12-08 if still over quota. Billing and plan
settings were not changed.
