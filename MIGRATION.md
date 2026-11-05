# Moving Reader Studio material into Reader Notes

## What is available now

Choose **Import from Reader Studio** in the Reader Notes library. The workbench
can inventory several source formats together, preview records, download a
report, retain exact original files on this device, and create small plain-text
trial copies. It does not perform a full-fidelity bulk migration yet.

Preview is read-only. It does not read another site's browser storage, modify
Reader Studio, fetch remote sources, upload original archives, execute imported
JavaScript/HTML, or import passwords/session settings.

## Prepare the source material

1. Save edits in the Reader Studio browser/profile where you actually worked.
2. Export its full editing archive (`study-studio-all-edits-YYYY-MM-DD.json`).
   A compatible portable reading package can also be inspected, but it omits
   files, media, global dictionary corrections and some other records.
3. Include `reading-review-catalog.js` from the Studio project when available.
   This supplies matching titles, source paths and note/log keys. It is parsed
   as JSON data, never executed.
4. For the project dictionary, include `dictionary.csv` and `sources.csv`, or
   the generated `dictionary_data.js`. In the dictionary UI choose **Export
   local edits** and include `reading_lexicon_local_edits.json` as well.
5. Keep the original PDF/EPUB files, HTML/text sources and attachments. Editing
   archives do not embed all of these. You may stage them alongside the exports.
6. Keep a separate backup of Reader Notes before trials. Retain source exports
   outside the browser even after staging succeeds.

Browser origins/profiles have separate saved edits. If several devices contain
unique work, export each and inspect together. A publication snapshot may be
older than the latest browser drafts; the tool does not assume it is current.

## Inspect and report

Select up to 60 files, no more than 50 MB per file or 100 MB total. Supported
inspection adapters include:

| Input | Current handling |
| --- | --- |
| Full editing archive v1 | Classifies every storage record and finds supported article snapshots |
| Portable package v1 | Verifies content fingerprints and history envelopes before inspection |
| Reader article backup v1 | Previews the saved edition and readable notes |
| Reading review catalog | Resolves titles, original paths and associated note/log keys |
| Dictionary/source CSV | Counts entries/occurrences; keeps every original column in the source file |
| Dictionary corrections v1 | Counts personal overrides without overwriting base definitions |
| Generated dictionary JS | Parses the JSON assignment; never executes code |
| TXT/Markdown | Offers a plain-text trial copy |
| HTML editor/source | Retains original bytes; never executes the editor page |
| PDF/EPUB/media | Retains original bytes; automatic asset matching is pending |
| Unknown/corrupt schema | Reports the problem; original file can still be retained |

The inventory distinguishes article versions from distinct article identities.
Older paginated `:editor:vN` chapter revisions share a destination identity.
Conflicting versions require an explicit choice; timestamps or iMac role do not
silently decide which version replaces another.

Detected note/history counts may include both embedded snapshots and separate
records. They are structural inventory counts, not deduplicated imported totals.
Referenced asset paths are compared with selected filenames to identify missing
files. A filename match is only a suggestion; files are not automatically linked.
The report records source SHA-256 hashes, classifications, source keys, target
IDs and warnings; it excludes raw record values and credentials. A report is not
a content backup.

## Retain originals

**Retain originals on this device** stores the chosen files and report in one
IndexedDB transaction without adding reading-library articles. Device archives
provide individual original-file and report downloads. Original downloads are
checked against their recorded SHA-256 hash.

Staged files belong to the current local/account library. They are temporary
device caches, excluded from ordinary Reader Notes JSON backups and cloud sync,
and cleared when that account signs out. The original files you selected remain
untouched. Keep them outside browser storage as the authoritative archive.

## Plain-text trial

Expand **Inspect records and select trial copies**, filter if necessary, and
select between 1 and 10 article versions. Select only one version of each source
article. Review the excerpts and acknowledge the limitations before importing.

- Text and supported readable notes/footnotes become an editable reading copy.
- Page boundaries from supported paginated records receive labels.
- Rich formatting, inline annotations, attachment relationships, structured
  vocabulary, editing history and global dictionaries remain in the originals.
- Recognized deletion/suppression records filter removed reading notes. If their
  format is uncertain, those notes remain archive-only rather than reappearing.
- Article vocabulary is inventoried but not converted into personal vocabulary
  yet; pronunciation/difficulty/source relationships need a dedicated adapter.
- Unsupported or oversized records cannot be trial-imported.
- Source files, report and selected articles commit atomically. A stale-preview
  ID collision aborts the entire transaction instead of replacing existing work.
- Deterministic destination IDs prevent repeat imports from duplicating articles.
  Existing articles are skipped; changed destinations are reported as conflicts.
- Reading copies enter the library's ordinary save/sync queue. Original archives
  and dictionary datasets remain device-only. Use the normal library to open,
  edit, export or move trial copies to trash.

You can manually attach the correct source PDF to a trial copy using **Files &
recovery → Open reference PDF**.

This is a pilot, not a replacement for the rich original. Compare multilingual
text, readable notes, footnote content, source keys and the archived originals.

## Verification performed

Automated fixtures cover schema validation, portable fingerprints, inert HTML
and JS, quoted multiline CSV, note suppression, source-version conflicts,
destination protection, timestamp-only changes and legacy chapter identities.
Browser checks cover a real version-1 → version-2 IndexedDB upgrade, unchanged
library after preview/staging, byte-exact source recovery, acknowledgement before
trial import, repeat imports, edited-destination protection and transaction
rollback on a stale collision. Fixtures contain no personal source exports.

A read-only dry run also inspected the existing October 31 full archive, current
reading catalog and generated dictionary CSVs locally. It detected 375 archive
records, 101 supported article-version records grouped into 80 identities, 2,726
dictionary entries, 3,870 source-occurrence rows and 11 dictionary corrections.
34 article-version records needed explicit source-version choices. No source
format errors occurred. No real articles or dictionary entries were installed
in Reader Notes, and no source exports were added to the Git repository.

## Remaining migration work

Before bulk migration: introduce faithful rich editions, chapter/collection
relationships, typed annotations with stable anchors, recoverable imported
history, a dictionary library separate from personal vocabulary, correction
layers, and file-to-document links. Add adapter-specific counts and verification
for unsupported editor/library formats, then trial representative real material
in the intended account before migrating larger batches.
