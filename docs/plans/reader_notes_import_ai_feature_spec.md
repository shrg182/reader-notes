# Reader Notes — File Import, Link Import, and AI Processing

[ChatGPT 2026-11-09 5:29 PM](https://chatgpt.com/c/6af1e6b8-ec6c-83ea-a4b0-1e01d9b17f5b)

**Purpose:** Implementation brief for Codex working in VS Code  
**Suggested workspace location:** `docs/plans/reader_notes_import_ai_feature_spec.md`  
**Status:** Proposed features and UI; not a description of functionality already implemented.

## 1. Goal

Extend the existing **Reader Notes** application so users can import reading material from local files **and URLs**, view it in the reader, select passages, and process content with an AI assistant. Preserve existing reading, notes, account, and library features. The visual direction is a clean, Google Sheets–inspired desktop application with understated green accents.

## 2. Main workflows

### A. Import local files

1. Open **Documents → Import** and choose **From Computer**.
2. Drag and drop one or more files, or click **Browse files**.
3. Show selected files with name, detected type, size, and remove control.
4. Choose import settings, then start import.
5. Show a per-file status: **Queued → Uploading → Extracting → Ready**, or **Failed** with a meaningful error and retry option.
6. Add successfully imported documents to the Library, where they can be opened in the reader.

Initial supported formats: **PDF, EPUB, DOCX, TXT, and Markdown (.md)**. Detect the actual format rather than relying solely on filename extensions. Show unsupported formats as errors without blocking other valid files.

### B. Import from links

1. Open **Documents → Import → From Links**.
2. Paste **one or more URLs**, one per line; ignore blank lines and report invalid entries individually.
3. Validate and preview each URL where practical (source domain, title/filename, detected content type).
4. Set the destination collection and optional tags; decide what to do with duplicates.
5. Click **Import from Links**.
6. Show each link's progress: **Queued → Fetching → Extracting → Ready** or **Failed**; support retry.
7. Save the source URL and attribution metadata with the imported document, then make the document available in the reader.

Target sources: publicly reachable direct document links (PDF, EPUB, DOCX, TXT, MD) and permitted web articles/HTML pages. Academic paper links may be supported if they resolve to accessible, permitted content. A bibliographic page or book catalog URL is **not** automatically a downloadable ebook. Do not bypass paywalls, authentication, DRM, or website restrictions.

**Conversion:** Prefer extracting normalized readable text for the reader. Offer **Convert to PDF** only when a reliable, supported conversion exists; it should be optional, not a requirement for import. Preserve original files where practical.

### C. Read and process with AI

1. Open an imported document in the reader.
2. Select a passage and click **Ask AI**, or explicitly choose to process the current document.
3. Choose one of five actions: **Summarize, Translate, Explain, Vocabulary, Questions**.
4. Show results in the right-side **AI Assistant** panel. Label the source passage/document and the operation performed.
5. Allow **Copy, Edit, Regenerate, Save to Notes, and Export**.
6. Attach saved AI notes to the originating document and, where possible, the original highlighted passage.

Support English, Chinese, and Russian text in display, selection, extraction, and translation. For translation, let users select a target language rather than assuming one.

## 3. UI structure

### Shared layout

- Left navigation: **Library**, **Notes**, **Documents**, **AI Tools**, **Settings**.
- Header: app name, library search, current document, and user controls.
- Main panel: context-specific reader or import workspace.
- Style: light background, compact toolbar and form elements, restrained green highlights, clear typography, keyboard accessibility, and responsive layout.

### Import screen — From Computer

- Tabs: **From Computer | From Links | From Cloud | From Scans (OCR)**.
- Large drag-and-drop zone with Browse button.
- Selected-files list and per-file progress/status.
- Import settings: destination, language detection, duplicate handling, and optionally extraction of existing highlights/notes.
- OCR toggle for scanned PDFs only if an OCR service/library is configured.
- Optional post-import AI summary; avoid making paid API calls without explicit opt-in.

**From Cloud** and **From Scans** can initially be visible as clearly marked future features, rather than nonfunctional controls that appear operational.

### Import screen — From Links

- Multiline URL text area; **Add another link** and **Clear** controls.
- URL validation with clear errors and, if available, previews.
- Advanced settings: file type (auto-detect), destination, tags, duplicates, optional conversion.
- **Import from Links** primary button.
- Right-side queue/progress view with individual statuses and error handling.
- After successful import: **Open in Reader** and optional AI processing shortcuts.

### Reader + AI panel

- Left: rendered document with selectable passages, page/chapter navigation, and highlight/annotation toolbar.
- Right: AI Assistant action buttons and result panel.
- Result controls: **Copy**, **Regenerate**, **Edit**, **Save to Notes**, **Export**.
- Clearly distinguish user-authored text, original source text, and AI-generated content.

## 4. Technical architecture (adapt to the existing repository)

Before coding, **inspect the existing project's framework, routes, data model, authentication, and storage**. Reuse the current stack and conventions where possible. Do not migrate the project to a new framework just because this brief mentions one.

Suggested separation of responsibilities:

- **Frontend:** import tabs, URL/file validation feedback, progress display, reader, AI side panel.
- **Backend or serverless endpoints:** secure URL retrieval, parsing, OCR/conversion if enabled, persistence, AI requests.
- **Storage:** original document file where supported; extracted text; source metadata; import status; notes and annotations.
- **Database:** document and import-job records linked to the authenticated user. Reuse existing Supabase infrastructure if already in place; a local-only variant could use SQLite.
- **AI integration:** server-side OpenAI API calls, with API key in environment/secrets management, never in client JavaScript.

Recommended document fields include: ID, owner ID, title, source type (`upload` or `url`), original URL (when relevant), MIME type, file size, content hash, import status, extracted content location, created/updated timestamps, and optional tags.

## 5. Security, reliability, and cost controls

- **URL import is security-sensitive.** Reject non-HTTP(S) schemes, loopback/private/link-local addresses, and internal service hosts; revalidate redirects and DNS destinations to prevent SSRF. Restrict ports and use bounded timeouts, download sizes, redirects, and response streaming.
- Sanitize extracted HTML; never execute scripts or untrusted document macros. Apply file size and resource limits during parsing.
- Keep files and notes private to their owners; enforce server-side authentication/authorization and storage access rules.
- Identify duplicates by robust content hash or appropriate source metadata, not by timestamp alone. Preserve conflicting records and ask before replacing.
- Show recoverable per-file/per-link errors; log failures without leaking secret values.
- AI calls should be explicitly initiated (or separately opted into), with clear processing state, cancellation where feasible, and reasonable request limits. Long documents may need chunking.
- OpenAI API usage is separate from a ChatGPT subscription; show the user that AI processing may incur API costs. Do not expose keys in the UI or Git commits.
- Respect website terms, robots/access policies as applicable, copyright, and source attribution. Do not claim to support Google Drive, Dropbox, or private URL access without implementing appropriate authorization.

## 6. Implementation sequence for Codex

**Phase 1 — Audit and plan**
- Inspect existing application and document model.
- Report relevant files, current architecture, dependencies, and potential conflicts.
- Propose smallest safe incremental changes before editing.

**Phase 2 — Local import MVP**
- Add From Computer UI and import endpoint/processing.
- Support at least TXT, MD, and text-based PDF initially; extend to DOCX and EPUB after tests.
- Persist documents and verify they open in the reader.

**Phase 3 — Link import MVP (priority feature)**
- Add multiline URL entry and secure server-side fetch.
- First support direct public PDF/TXT/MD links and simple readable HTML pages.
- Add queue/status, failures, retries, source metadata, deduplication.
- Extend to EPUB/DOCX if appropriate.

**Phase 4 — AI integration**
- Add selection-based Summarize/Translate/Explain/Vocabulary/Questions.
- Implement authenticated server-side OpenAI API request flow.
- Add edit, save-to-notes, and export actions.

**Phase 5 — Enhancements**
- Optional scanned-PDF OCR, existing PDF annotations, advanced conversion, batch processing, and cloud integrations.
- Responsive layout, keyboard accessibility, and performance work.

## 7. Acceptance criteria

- [ ] A user can import a valid local document and open it in Reader Notes.
- [ ] A user can paste multiple valid public document URLs and import them without using the local file picker.
- [ ] Invalid, inaccessible, or restricted URLs fail safely with actionable messages; other queued imports continue.
- [ ] Imported documents retain title, source link, and source type.
- [ ] Progress and failures are reflected correctly, with no misleading completion status.
- [ ] Duplicate handling does not silently erase user content.
- [ ] Imported text can be selected and sent to an AI action.
- [ ] AI output can be edited and saved to notes linked to the document.
- [ ] API credentials stay server-side and private documents remain access-controlled.
- [ ] Existing Reader Notes features continue to work; run existing tests plus new unit/integration tests.

## 8. Codex implementation instruction

> Inspect the current Reader Notes repository first. Treat this document as a product specification, not proof of implemented features. Implement the **From Links** import workflow as the first priority, reusing the existing architecture and preserving existing behavior. Explain the files you plan to change, implement the smallest functional vertical slice, add automated tests for success, error, duplicate, and SSRF cases, run appropriate checks, and summarize the code changes and any remaining limitations. Do not add fake progress, unsupported cloud services, or client-side API secrets.

## 9. Suggested repository location

Place this specification at:

`docs/plans/reader_notes_import_ai_feature_spec.md`

If `docs/plans/` does not exist, create it. Keep implementation notes and test results nearby so Codex can reference them during review.
