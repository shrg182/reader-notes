# Source-based annotated editions — 2026-11-10

Reader → 整理为校读稿 previews supported 5000言 article pages. This increment
uses source structure, not an AI model. It calls no OpenAI API and changes no
billing plan. Missing or uncertain pinyin is not inferred.

The existing authenticated reader-import-link endpoint accepts mode prepare-study.
It reuses auth validation, fetch rate limits (10/minute, 100/day), robots rules,
public-address/DNS/redirect checks and time/size bounds. This mode returns source
layers and a SHA-256 fingerprint without saving a document, category or PDF.
The only server mutation is the pre-existing fetch throttle. Both initial and
resolved source hosts must be 5000yan.com or its subdomains. No arbitrary scripts
or source HTML execute. Structured article absence/malformed JSON fails closed.

Primary data-section=原文 content is kept verbatim; hidden note-compare-panel
originals are separate alternatives. Translation is reference material, outside
the editable original. JSON note data becomes source_note entries. Only exact,
non-overlapping first occurrences get footnotes; longer terms win overlaps.
A source marker/name mismatch is not forcibly linked. Missing, mismatched,
fragmentary or overlapping notes are retained in the source review panel;
identifiable questionable spans also appear in the reader's 待核 register.
Source-supplied pronunciation is labeled as unreviewed rather than invented.

Preview is read-only until explicit Save. A clean, unchanged generic import can
be replaced in place: ID, placement and existing reading-workspace keys remain;
notes/media/preferences are preserved and the previous working edition enters
ordinary version history. Changed wording or rich body annotations disables
in-place replacement; New annotated copy leaves the original and its body
markings untouched. Private notes/media are copied, while original body markings
are explicitly not automatically relocated. Existing annotated packages reopen
their saved source preview without re-fetching/reprocessing.

Prepared source data lives in richState.studySource; the sandbox bridge preserves
it on flush and displays translation, all source notes, source review and alternate
originals beside the reader. Existing safe source links and clean/annotated
view controls remain available. Revision-aware RPCs save working editions. A
source conflict or failure retains device drafts rather than silently overwriting.

Verification: 52 unit/database tests; dedicated study browser tests cover preview,
explicit apply, original/translation separation, annotation links, private note
retention, rich flush/cloud revision handling, reload, idempotence and protected
copy creation. Existing organizer/import browser suites pass. Synthetic source
fixture is committed; real 唐人告命 extraction was inspected locally (one primary
paragraph, 14 source notes, 10 linked, one alternate original).

Deployment order: update reader-import-link bundle before publishing the client.
Project zkffujfbzbxoexohcmwk only; no schema/policy changes required.

Live deployment: Reader Notes project function ZIP matches the tested bundle
exactly after newline normalization. Build output is ASCII-safe to avoid native
text-file charset ambiguity during Dashboard copy/paste. Frontend Pages deployment
45f7020 succeeded. Actual 唐人告命 clean import passed the guard and was applied
in place: 10 source footnotes, 9 source review issues (5 anchored 待核 spans),
separate source translation, source URL retained, Synced.

Production reload confirmed Synced, 10 footnotes and all source layers intact.
