-- Private, durable Reader Studio preservation records. No anonymous/public grants.
begin;
create table public.reader_import_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  kind text not null check(kind in ('edition','dictionary','occurrences','corrections','archive','study')),
  title text not null check(length(title) between 1 and 200),
  book_id uuid,
  fingerprint text not null check(fingerprint ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check(octet_length(payload::text)<=15000000),
  created_at timestamptz not null default now(),
  primary key(owner_id,id),
  foreign key(owner_id,book_id) references public.reader_documents(user_id,id)
);
alter table public.reader_import_records enable row level security;
create policy import_owner_read on public.reader_import_records for select to authenticated using(owner_id=(select auth.uid()));
revoke all on public.reader_import_records from public,anon,authenticated;
grant select on public.reader_import_records to authenticated;
create function public.reader_import_record(p_record jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); existing public.reader_import_records; b jsonb:=p_record->'book'; result jsonb; doc public.reader_documents;
begin
  if uid is null then raise exception 'Sign in required';end if;
  perform pg_advisory_xact_lock(hashtextextended('import:'||uid::text||':'||(p_record->>'id'),0));
  select * into existing from public.reader_import_records where owner_id=uid and id=(p_record->>'id')::uuid;
  if existing.id is not null then
    if existing.fingerprint<>p_record->>'fingerprint' then raise exception 'Imported source changed; preserve it as a separate version';end if;
    return jsonb_build_object('alreadyImported',true);
  end if;
  if b is not null and b<>'null'::jsonb then
    if p_record->>'kind'<>'edition' or b->>'id'<>p_record->>'bookId' then raise exception 'Invalid imported article';end if;
    select * into doc from public.reader_documents where user_id=uid and id=(b->>'id')::uuid;
    if doc.id is not null then raise exception 'Destination article already exists; existing work was preserved';end if;
    result:=public.save_reader_document((b->>'id')::uuid,b->>'title',b->>'language',b->>'content',b->>'notes',false,0);
    if (result->>'conflict')::boolean then raise exception 'Destination article changed';end if;
  elsif p_record->>'bookId' is not null then raise exception 'Missing imported article';
  end if;
  insert into public.reader_import_records(owner_id,id,kind,title,book_id,fingerprint,payload)
    values(uid,(p_record->>'id')::uuid,p_record->>'kind',p_record->>'title',(p_record->>'bookId')::uuid,p_record->>'fingerprint',p_record->'payload');
  return jsonb_build_object('alreadyImported',false);
end;
$$;
revoke all on function public.reader_import_record(jsonb) from public,anon;
grant execute on function public.reader_import_record(jsonb) to authenticated;
commit;
