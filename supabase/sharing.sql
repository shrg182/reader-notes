-- Apply AFTER schema.sql in the dedicated reader project. Existing documents
-- and their notes remain owner-only. Only explicit snapshots become shareable.
begin;
create table public.reader_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);
create table public.reader_group_members (
  group_id uuid not null references public.reader_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check(length(btrim(display_name)) between 1 and 80),
  role text not null check(role in ('organizer','member')),
  primary key(group_id,user_id)
);
create table public.reader_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reader_groups(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked boolean not null default false
);
create table public.reader_publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null,
  title text not null,
  language text not null,
  content text not null,
  visibility text not null default 'private' check(visibility in ('private','group','public')),
  group_ids uuid[] not null default '{}',
  source_revision bigint not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  unique(owner_id,document_id),
  foreign key(owner_id,document_id) references public.reader_documents(user_id,id) on delete cascade,
  check ((visibility='group' and cardinality(group_ids)>0) or (visibility<>'group' and cardinality(group_ids)=0))
);
create table public.reader_contribution_drafts (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- Logical reference: deleting someone else's source must not delete this
  -- reader's independently owned private notes. Creation is checked by the RPC.
  source_id uuid not null,
  kind text not null check(kind in ('pinyin','inline','annotation','footnote','note','highlight','revision')),
  body text not null check(length(btrim(body)) between 1 and 1000000),
  quote text not null default '' check(length(quote)<=5000),
  anchor_start integer,
  anchor_end integer,
  source_revision bigint not null,
  requested_visibility text not null default 'private' check(requested_visibility in ('private','group','public')),
  group_ids uuid[] not null default '{}',
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  check ((anchor_start is null and anchor_end is null) or (anchor_start is not null and anchor_end is not null and anchor_start>=0 and anchor_end>=anchor_start)),
  check ((requested_visibility='group' and cardinality(group_ids)>0) or (requested_visibility<>'group' and cardinality(group_ids)=0))
);
create table public.reader_shared_contributions (
  id uuid primary key references public.reader_contribution_drafts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.reader_publications(id) on delete cascade,
  kind text not null,
  body text not null,
  quote text not null,
  anchor_start integer,
  anchor_end integer,
  source_revision bigint not null,
  visibility text not null check(visibility in ('private','group','public')),
  group_ids uuid[] not null default '{}',
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create table public.reader_contribution_versions (
  contribution_id uuid not null references public.reader_contribution_drafts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null,
  edition jsonb not null,
  primary key(contribution_id,revision)
);

create function public.reader_is_group_member(p_group uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.reader_group_members where group_id=p_group and user_id=auth.uid());
$$;
create function public.reader_audience_allows(p_visibility text,p_groups uuid[]) returns boolean
language sql stable security definer set search_path='' as $$
  select p_visibility='public' or (p_visibility='group' and exists(select 1 from public.reader_group_members where group_id=any(p_groups) and user_id=auth.uid()));
$$;
create function public.reader_can_read_source(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.reader_publications s where s.id=p_id and
    (s.owner_id=auth.uid() or (exists(select 1 from public.reader_documents d where d.user_id=s.owner_id and d.id=s.document_id and not d.deleted)
      and public.reader_audience_allows(s.visibility,s.group_ids))));
$$;
create function public.reader_validate_audience(p_visibility text,p_groups uuid[],p_source_visibility text default null,p_source_groups uuid[] default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_visibility is null or p_visibility not in ('private','group','public') or p_groups is null
    or cardinality(p_groups)>20 or array_position(p_groups,null) is not null
    or cardinality(p_groups)<>(select count(distinct g) from unnest(p_groups) g)
    or (p_visibility='group')<>(cardinality(p_groups)>0) then raise exception 'Invalid audience'; end if;
  if p_visibility='group' and exists(select 1 from unnest(p_groups) g where not public.reader_is_group_member(g)) then raise exception 'Join each selected group first'; end if;
  if p_source_visibility='private' and p_visibility<>'private' then raise exception 'The source is private'; end if;
  if p_source_visibility='group' and (p_visibility='public' or (p_visibility='group' and not p_groups<@p_source_groups)) then raise exception 'Contribution audience exceeds source audience'; end if;
end;
$$;

alter table public.reader_groups enable row level security;
alter table public.reader_group_members enable row level security;
alter table public.reader_group_invites enable row level security;
alter table public.reader_publications enable row level security;
alter table public.reader_contribution_drafts enable row level security;
alter table public.reader_shared_contributions enable row level security;
alter table public.reader_contribution_versions enable row level security;
create policy group_members_read on public.reader_groups for select to authenticated using(public.reader_is_group_member(id));
create policy membership_read on public.reader_group_members for select to authenticated using(public.reader_is_group_member(group_id));
create policy source_read on public.reader_publications for select to anon,authenticated using(public.reader_can_read_source(id));
create policy draft_owner_read on public.reader_contribution_drafts for select to authenticated using(owner_id=(select auth.uid()));
create policy contribution_read on public.reader_shared_contributions for select to anon,authenticated using(
  owner_id=(select auth.uid()) or (public.reader_can_read_source(source_id) and public.reader_audience_allows(visibility,group_ids)));
create policy contribution_history_owner on public.reader_contribution_versions for select to authenticated using(owner_id=(select auth.uid()));
revoke all on public.reader_groups,public.reader_group_members,public.reader_group_invites,public.reader_publications,
 public.reader_contribution_drafts,public.reader_shared_contributions,public.reader_contribution_versions from public,anon,authenticated;
grant select on public.reader_publications,public.reader_shared_contributions to anon,authenticated;
grant select on public.reader_groups,public.reader_group_members,public.reader_contribution_drafts,public.reader_contribution_versions to authenticated;

create function public.reader_withdraw_trashed_book() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.deleted then update public.reader_publications set visibility='private',group_ids='{}',revision=revision+1,updated_at=clock_timestamp() where owner_id=new.user_id and document_id=new.id; end if;
  return new;
end;
$$;
create trigger reader_trash_withdraw after update of deleted on public.reader_documents for each row when(new.deleted and not old.deleted) execute function public.reader_withdraw_trashed_book();
revoke all on function public.reader_withdraw_trashed_book() from public,anon,authenticated;

create function public.reader_create_group(p_name text,p_display_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.reader_groups; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Sign in required'; end if;
  insert into public.reader_groups(owner_id,name) values(uid,btrim(p_name)) returning * into result;
  insert into public.reader_group_members values(result.id,uid,btrim(p_display_name),'organizer');
  return to_jsonb(result);
end;
$$;
create function public.reader_invite_group(p_group uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare token text:=gen_random_uuid()::text; result public.reader_group_invites;
begin
  if not exists(select 1 from public.reader_groups where id=p_group and owner_id=auth.uid()) then raise exception 'Organizer access required'; end if;
  insert into public.reader_group_invites(group_id,token_hash,expires_at) values(p_group,encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '7 days') returning * into result;
  return jsonb_build_object('code',token,'expires_at',result.expires_at);
end;
$$;
create function public.reader_join_group(p_code text,p_display_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare invite public.reader_group_invites; result public.reader_groups; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Sign in required'; end if;
  select * into invite from public.reader_group_invites where token_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex') and not revoked and expires_at>now();
  if invite.id is null then raise exception 'Invitation is invalid or expired'; end if;
  insert into public.reader_group_members values(invite.group_id,uid,btrim(p_display_name),'member') on conflict(group_id,user_id) do nothing;
  select * into result from public.reader_groups where id=invite.group_id;
  return to_jsonb(result);
end;
$$;
create function public.reader_revoke_invites(p_group uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.reader_groups where id=p_group and owner_id=auth.uid()) then raise exception 'Organizer access required'; end if;
  update public.reader_group_invites set revoked=true where group_id=p_group;
end;
$$;
create function public.reader_remove_member(p_group uuid,p_member uuid) returns void
language plpgsql security definer set search_path='' as $$
declare organizer uuid;
begin
  select owner_id into organizer from public.reader_groups where id=p_group;
  if auth.uid() is null or (organizer<>auth.uid() and p_member<>auth.uid()) then raise exception 'Organizer access required'; end if;
  if p_member=organizer then raise exception 'The organizer cannot leave their own group'; end if;
  delete from public.reader_group_members where group_id=p_group and user_id=p_member;
end;
$$;
create function public.reader_publish_book(p_document uuid,p_document_revision bigint,p_visibility text,p_groups uuid[],p_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare source public.reader_documents; existing public.reader_publications; result public.reader_publications; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Sign in required'; end if;
  perform public.reader_validate_audience(p_visibility,p_groups);
  select * into source from public.reader_documents where user_id=uid and id=p_document for share;
  if source.id is null or source.deleted then raise exception 'Source document unavailable'; end if;
  if source.revision<>p_document_revision then raise exception 'Source changed; review the latest edition before publishing'; end if;
  if p_revision is null or p_revision<0 then raise exception 'Invalid revision'; end if;
  perform pg_advisory_xact_lock(hashtextextended('publication:'||uid::text||':'||p_document::text,0));
  select * into existing from public.reader_publications where owner_id=uid and document_id=p_document;
  if coalesce(existing.revision,0)<>p_revision then return jsonb_build_object('conflict',true,'publication',to_jsonb(existing)); end if;
  insert into public.reader_publications(owner_id,document_id,title,language,content,visibility,group_ids,source_revision)
    values(uid,p_document,source.title,source.language,source.content,p_visibility,p_groups,source.revision)
  on conflict(owner_id,document_id) do update set title=excluded.title,language=excluded.language,content=excluded.content,
    visibility=excluded.visibility,group_ids=excluded.group_ids,source_revision=excluded.source_revision,
    revision=public.reader_publications.revision+1,updated_at=clock_timestamp() returning * into result;
  return jsonb_build_object('conflict',false,'publication',to_jsonb(result));
end;
$$;
create function public.reader_save_contribution(p_id uuid,p_source uuid,p_kind text,p_body text,p_quote text,p_start integer,p_end integer,p_source_revision bigint,p_visibility text,p_groups uuid[],p_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing public.reader_contribution_drafts; result public.reader_contribution_drafts; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if p_id is null or p_revision is null or p_revision<0 or p_source_revision is null or p_source_revision<1 then raise exception 'Invalid contribution'; end if;
  perform public.reader_validate_audience(p_visibility,p_groups);
  perform pg_advisory_xact_lock(hashtextextended('contribution:'||p_id::text,0));
  select * into existing from public.reader_contribution_drafts where id=p_id;
  if existing.id is not null and existing.owner_id<>uid then raise exception 'Contribution belongs to another reader'; end if;
  if existing.id is not null and existing.source_id<>p_source then raise exception 'Contribution source cannot change'; end if;
  if not public.reader_can_read_source(p_source) and not(existing.id is not null and p_visibility='private') then raise exception 'Source unavailable'; end if;
  if coalesce(existing.revision,0)<>p_revision then return jsonb_build_object('conflict',true,'draft',to_jsonb(existing)); end if;
  insert into public.reader_contribution_drafts(id,owner_id,source_id,kind,body,quote,anchor_start,anchor_end,source_revision,requested_visibility,group_ids)
    values(p_id,uid,p_source,p_kind,p_body,p_quote,p_start,p_end,p_source_revision,p_visibility,p_groups)
  on conflict(id) do update set kind=excluded.kind,body=excluded.body,quote=excluded.quote,anchor_start=excluded.anchor_start,anchor_end=excluded.anchor_end,
    source_revision=excluded.source_revision,requested_visibility=excluded.requested_visibility,group_ids=excluded.group_ids,
    revision=public.reader_contribution_drafts.revision+1,updated_at=clock_timestamp() returning * into result;
  insert into public.reader_contribution_versions values(result.id,uid,result.revision,to_jsonb(result));
  return jsonb_build_object('conflict',false,'draft',to_jsonb(result));
end;
$$;
create function public.reader_publish_contribution(p_id uuid,p_draft_revision bigint,p_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare draft public.reader_contribution_drafts; source public.reader_publications; existing public.reader_shared_contributions; result public.reader_shared_contributions; uid uuid:=auth.uid();
begin
  if uid is null or p_revision is null or p_revision<0 or p_draft_revision is null or p_draft_revision<1 then raise exception 'Sign in and provide a valid revision'; end if;
  select * into draft from public.reader_contribution_drafts where id=p_id and owner_id=uid for update;
  if draft.id is null or draft.revision<>p_draft_revision then raise exception 'Draft changed; review it again'; end if;
  if draft.requested_visibility='private' and not exists(select 1 from public.reader_publications where id=draft.source_id) then
    return jsonb_build_object('conflict',false,'publication',null);
  end if;
  if draft.requested_visibility<>'private' then
    select * into source from public.reader_publications where id=draft.source_id for share;
    if not public.reader_can_read_source(draft.source_id) then raise exception 'Source unavailable'; end if;
    perform public.reader_validate_audience(draft.requested_visibility,draft.group_ids,source.visibility,source.group_ids);
    if draft.source_revision<>source.revision then raise exception 'Source edition changed; reattach or review this contribution'; end if;
    if draft.quote<>'' and (draft.anchor_start is null or draft.anchor_end is null or
       substring(source.content from draft.anchor_start+1 for draft.anchor_end-draft.anchor_start)<>draft.quote) then raise exception 'Passage anchor no longer matches'; end if;
  end if;
  select * into existing from public.reader_shared_contributions where id=p_id;
  if coalesce(existing.revision,0)<>p_revision then return jsonb_build_object('conflict',true,'publication',to_jsonb(existing)); end if;
  insert into public.reader_shared_contributions(id,owner_id,source_id,kind,body,quote,anchor_start,anchor_end,source_revision,visibility,group_ids)
    values(draft.id,uid,draft.source_id,draft.kind,draft.body,draft.quote,draft.anchor_start,draft.anchor_end,draft.source_revision,draft.requested_visibility,draft.group_ids)
  on conflict(id) do update set kind=excluded.kind,body=excluded.body,quote=excluded.quote,anchor_start=excluded.anchor_start,anchor_end=excluded.anchor_end,
    source_revision=excluded.source_revision,visibility=excluded.visibility,group_ids=excluded.group_ids,
    revision=public.reader_shared_contributions.revision+1,updated_at=clock_timestamp() returning * into result;
  return jsonb_build_object('conflict',false,'publication',to_jsonb(result));
end;
$$;
revoke all on function public.reader_is_group_member(uuid), public.reader_audience_allows(text,uuid[]),public.reader_can_read_source(uuid) from public,anon,authenticated;
grant execute on function public.reader_is_group_member(uuid), public.reader_audience_allows(text,uuid[]),public.reader_can_read_source(uuid) to anon,authenticated;
revoke all on function public.reader_validate_audience(text,uuid[],text,uuid[]) from public,anon,authenticated;
revoke all on function public.reader_create_group(text,text),public.reader_invite_group(uuid),public.reader_join_group(text,text),public.reader_revoke_invites(uuid),public.reader_remove_member(uuid,uuid),
 public.reader_publish_book(uuid,bigint,text,uuid[],bigint),public.reader_save_contribution(uuid,uuid,text,text,text,integer,integer,bigint,text,uuid[],bigint),public.reader_publish_contribution(uuid,bigint,bigint) from public,anon,authenticated;
grant execute on function public.reader_create_group(text,text),public.reader_invite_group(uuid),public.reader_join_group(text,text),public.reader_revoke_invites(uuid),public.reader_remove_member(uuid,uuid),
 public.reader_publish_book(uuid,bigint,text,uuid[],bigint),public.reader_save_contribution(uuid,uuid,text,text,text,integer,integer,bigint,text,uuid[],bigint),public.reader_publish_contribution(uuid,bigint,bigint) to authenticated;
commit;
