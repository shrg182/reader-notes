# Independent source and contribution audiences

## Reading and editing

Each library item has a **Sharing** action. The workspace's **Contributions**
block opens the same interface. The personal working copy and separate **Private
reading notes** field remain owner-only. Publishing creates a separate, reviewed
snapshot with Private, Selected groups, or Public access. Its payload contains
only title, language and article text; it excludes personal notes, vocabulary,
original PDFs, migration archives and editing history.

Each contribution has its own owner and audience. Types include pinyin, inline
notes, annotations, footnotes, reading notes, highlight explanations and revised
editions. These are typed, passage-linked layer records; rich inline/ruby and
superscript rendering remain future work.

1. Open a source edition, select a passage if needed, and choose a contribution
   type. **Start revised edition from source** copies source text into your own
   contribution editor without modifying the original.
2. Set **Audience on publish**. The initial choice is Private.
3. **Save private draft** saves your working version locally and, when configured
   and attached to an available source, to your private account draft table.
   Even a draft whose requested audience is Public remains private at this point.
4. **Review visibility / publish** shows the exact contribution and audience.
   Only the final publication action updates its shared snapshot.
5. To withdraw a contribution, choose Private and explicitly apply **Keep private
   / withdraw shared copy**. Other contributions and the source keep their own
   settings.

For account synchronization of notes on a private book, choose Private for the
book and **Save private source edition**. This saves an owner-only source
snapshot; it does not make the book public.

A newer private draft never replaces an older public snapshot automatically.
Draft history is owner-only. Source owners and group organizers cannot inspect
or publish other readers' private drafts.

The same separation applies to books: saving article edits does not update its
published edition. Sharing status is reported as unknown if it cannot be checked;
offline changes are never described as successful withdrawal.

Everything already inside the article body is included in the publication preview.
A plain-text legacy trial may have flattened old inline notes into that body.
Review/remove those passages before publishing; faithful structured migration is
still pending. Separately stored private notes are never copied to the snapshot.

## Layers and source references

The shared reader offers Source edition only, My working drafts, Public
contributions, Group contributions, or all permitted layers. Alternative editions
can be displayed and switched back to the original. They never overwrite it.

Passage references use Unicode character positions, retain the original quote,
and handle CRLF normalization in browser textareas. Publishing requires the current
source revision and a matching quote. Source changes flag stale references for
review/reattachment; there is no silent attachment to similar wording.

Private drafts are independently owned. If a source owner deletes their source
or account, other readers' private notes remain in the database, while attached
public snapshots disappear. Orphan notes remain exportable. A standalone orphan
note dashboard is future work.

## Groups

**Reading groups** supports several groups, joining by invitation code, voluntary
group display names, member lists, organizer removal, leaving, and invitation
revocation. An organizer manages membership, not ownership of members' work.
Contributions are edited by their own authors. Moderation roles, assignments,
ownership transfer and real-time coediting remain future work.

Codes expire after seven days. Anyone holding a valid code can join until it
expires or is revoked; share it only with intended friends. Only a hash is stored
server-side. Codes are shown transiently, excluded from backups, and never emailed
or messaged automatically. Revoking invitations does not remove existing members.

For a non-owner, contribution access is the intersection of its audience and the
source audience:

| Source | Contribution | Effective readership |
| --- | --- | --- |
| Public | Private | Contribution author only |
| Public | Public | Everyone |
| Public | Selected groups | Selected group members |
| Selected groups | Selected subset | Members of that subset |
| Private / withdrawn | Previously shared | Hidden from readers without source access |

New public contributions on group-only sources are rejected. Group contributions
cannot target groups outside the source audience. Changing the source does not
rewrite contribution settings. Previously public contributions may become readable
again if their source is deliberately made public again; private drafts remain
private throughout.

Trashing a synchronized source withdraws its publication. Restoring it does not
republish it. Offline trash/withdrawal cannot change server access until a server
operation succeeds. Membership removal ends future authorized requests. Access
controls cannot retrieve downloaded copies or erase content already displayed in
another browser.

## Local drafts, backups and limits

With sharing unconfigured, own-library contribution drafts, type choices, audience
planning, passage links and backups work locally. Live publication and group
management are disabled. Signed-out local mode is a shared browser notebook,
not an authenticated private account.

JSON backups include the author's drafts, not live grants or other users' shared
snapshots. Imports create private drafts with fresh IDs and retained provenance,
skip duplicate imports, and never restore public/group publication automatically.
Existing server publications are not changed by backup import. Sign-out offers
a backup before clearing cached study data.

Shared-source browsing requires a connection and current access. Original file
sharing and full shared-reader toolbar parity are not implemented. Dictionaries
and vocabulary retain their existing private/device scope; scoped dictionary
libraries will reuse this audience model after structured migration is ready.
The existing one-editing-tab-per-library lock still applies, including reading
links opened in the same browser profile; use the current Reader Notes tab.

## Enable live sharing

Live sharing is deliberately off in `config.js`; the project's URL/key remain
blank. No production migration or external permission change was performed.

1. Configure a dedicated reader project using `supabase/SETUP.md`. On a fresh
   project, install `supabase/schema.sql` once.
2. Review and apply `supabase/sharing.sql` once. It adds groups, hashed invitations,
   source snapshots, private drafts and owner-only history. Existing document/note
   ownership policies remain intact.
3. Run `supabase/verify.sql` and `supabase/sharing-verify.sql` in a dedicated test
   project. Both use rollback-only fixtures and send no emails.
4. Check real Auth sessions for owner, member, nonmember and anonymous reader.
   Verify email flows, member removal, independent publication/withdrawal, source
   trash/restore and private draft isolation on real devices.
5. Set only the public project URL/client key and `sharingEnabled: true`, then
   deploy. Never place service-role keys, database passwords or invitation codes
   in public configuration. Enabling UI configuration does not install policies.

All exposed tables have row-level security. Direct writes are revoked. Functions
bind ownership to `auth.uid()`, check membership and reject stale revisions. Source
snapshots physically lack a private-notes column. Private drafts and shared
snapshots use separate tables, preventing draft edits from becoming public via
an audience toggle on an existing shared row.

## Verification

`npm ci && npm test` runs model tests and the SQL migrations/verification in
isolated PGlite PostgreSQL with fixture Auth roles. It does not contact Supabase.
Assertions cover ownership, anonymous denial, private draft/public snapshot
separation, group bounds, revocation, Unicode anchors, stale revisions, trash and
preservation of notes after source-owner deletion.

Chrome tests additionally mock the API to check publishing previews, private
restore defaults, public books with private pinyin, public footnotes, alternative
editions, later private edits, withdrawal, organizer controls and anonymous links.
Mocks do not replace live-project verification.

References: [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PGlite](https://pglite.dev/docs/).
