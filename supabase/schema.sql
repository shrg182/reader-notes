-- Reader Notes foundation. Run once in a NEW reader Supabase project.
-- All objects are installed transactionally. This does not alter Daymark tables.
begin;

create table public.reader_documents (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  language text not null default '' check (length(language) <= 40),
  content text not null default '' check (length(content) <= 1000000),
  notes text not null default '' check (length(notes) <= 1000000),
  deleted boolean not null default false,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
create table public.reader_document_versions (
  user_id uuid not null,
  document_id uuid not null,
  revision bigint not null,
  edition jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id,document_id,revision),
  foreign key (user_id,document_id) references public.reader_documents(user_id,id) on delete cascade
);
alter table public.reader_documents enable row level security;
alter table public.reader_document_versions enable row level security;
create policy reader_own_documents on public.reader_documents for select to authenticated
  using ((select auth.uid())=user_id);
create policy reader_own_versions on public.reader_document_versions for select to authenticated
  using ((select auth.uid())=user_id);
revoke all on public.reader_documents,public.reader_document_versions from public,anon,authenticated;
grant select on public.reader_documents,public.reader_document_versions to authenticated;

create function public.save_reader_document(
  p_id uuid,p_title text,p_language text,p_content text,p_notes text,
  p_deleted boolean,p_revision bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid();
  existing public.reader_documents;
  result public.reader_documents;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if p_id is null or p_title is null or length(btrim(p_title)) not between 1 and 200
    or p_language is null or length(p_language)>40
    or p_content is null or length(p_content)>1000000
    or p_notes is null or length(p_notes)>1000000
    or p_deleted is null or p_revision is null or p_revision<0 then
    raise exception 'Invalid article';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_id::text,0));
  select * into existing from public.reader_documents where user_id=uid and id=p_id;
  if coalesce(existing.revision,0)<>p_revision then
    return jsonb_build_object('conflict',true,'document',to_jsonb(existing));
  end if;
  insert into public.reader_documents(user_id,id,title,language,content,notes,deleted)
    values(uid,p_id,btrim(p_title),p_language,p_content,p_notes,p_deleted)
  on conflict (user_id,id) do update set
    title=excluded.title,language=excluded.language,content=excluded.content,
    notes=excluded.notes,deleted=excluded.deleted,
    revision=public.reader_documents.revision+1,updated_at=clock_timestamp()
  returning * into result;
  insert into public.reader_document_versions(user_id,document_id,revision,edition)
    values(uid,p_id,result.revision,to_jsonb(result));
  return jsonb_build_object('conflict',false,'document',to_jsonb(result));
end;
$$;
revoke all on function public.save_reader_document(uuid,text,text,text,text,boolean,bigint) from public,anon;
grant execute on function public.save_reader_document(uuid,text,text,text,text,boolean,bigint) to authenticated;
commit;
