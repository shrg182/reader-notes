-- Additive: only the Reader Notes project zkffujfbzbxoexohcmwk.
begin;
create table if not exists public.reader_link_sources(
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,kind text not null check(kind in ('text','pdf')),
 original_url text not null check(length(original_url)<=2048 and original_url ~ '^https?://'),
 resolved_url text not null check(length(resolved_url)<=2048 and resolved_url ~ '^https?://'),
 title text not null check(length(title) between 1 and 200),
 mime_type text not null check(length(mime_type)<=100),filename text not null check(length(filename)<=200),
 size_bytes bigint not null check(size_bytes between 1 and 20971520),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 tags jsonb not null default '[]' check(jsonb_typeof(tags)='array' and jsonb_array_length(tags)<=10 and length(tags::text)<=1000),
 status text not null check(status in ('pending','ready')),
 created_at timestamptz not null default now(),primary key(user_id,id),unique(user_id,sha256)
);
create table if not exists public.reader_link_limits(
 user_id uuid primary key references auth.users(id) on delete cascade,
 minute_start timestamptz not null,minute_count integer not null,
 day_start date not null,day_count integer not null
);
alter table public.reader_link_sources enable row level security;
alter table public.reader_link_limits enable row level security;
drop policy if exists reader_own_link_sources on public.reader_link_sources;
create policy reader_own_link_sources on public.reader_link_sources for select to authenticated using((select auth.uid())=user_id);
revoke all on public.reader_link_sources,public.reader_link_limits from public,anon,authenticated;
grant select on public.reader_link_sources to authenticated;
create or replace function public.reader_claim_link_fetch() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result public.reader_link_limits;
begin
 if uid is null then raise exception 'Sign in required';end if;
 insert into public.reader_link_limits values(uid,date_trunc('minute',now()),1,current_date,1)
 on conflict(user_id) do update set
 minute_start=date_trunc('minute',now()),minute_count=case when reader_link_limits.minute_start=date_trunc('minute',now()) then reader_link_limits.minute_count+1 else 1 end,
 day_start=current_date,day_count=case when reader_link_limits.day_start=current_date then reader_link_limits.day_count+1 else 1 end
 returning * into result;
 if result.minute_count>10 or result.day_count>100 then raise exception 'Import limit reached. Try again later (10 links/minute, 100/day).';end if;
end;$$;
create or replace function public.reader_import_link(p_source jsonb,p_content text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); entry public.reader_link_sources; target jsonb; identity uuid; category text:=p_source->>'category'; kind text:=p_source->>'kind'; digest text:=p_source->>'sha256'; existing_pdf public.reader_pdfs; is_duplicate boolean:=false;
begin
 if uid is null then raise exception 'Sign in required';end if;
 if kind is null or kind not in ('pdf','text') or digest is null or digest !~ '^[a-f0-9]{64}$'
 or category is null or length(category) not between 1 and 120 then raise exception 'Invalid link import';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':link:'||digest,0));
 select * into entry from public.reader_link_sources where user_id=uid and sha256=digest;
 if found then
  if entry.kind='text' then select to_jsonb(d) into target from public.reader_documents d where user_id=uid and id=entry.id;
  else select to_jsonb(d) into target from public.reader_pdfs d where user_id=uid and id=entry.id;end if;
  return jsonb_build_object('source',to_jsonb(entry),'target',target,'duplicate',entry.status='ready');
 end if;
 perform public.reader_save_category(category,p_source->>'category_title');identity=gen_random_uuid();
 if kind='pdf' then
  select * into existing_pdf from public.reader_pdfs where user_id=uid and sha256=digest order by created_at limit 1;
  if found then
   identity=existing_pdf.id;target=to_jsonb(existing_pdf);is_duplicate=existing_pdf.status<>'uploading';
  else target=public.reader_reserve_pdf(identity,p_source->>'title',category,p_source->>'filename',(p_source->>'size_bytes')::bigint,digest);end if;
 else
  if p_content is null or length(btrim(p_content))=0 or length(p_content)>1000000 then raise exception 'Empty or oversized article';end if;
  target=public.save_reader_document(identity,p_source->>'title','',p_content,'',false,0)->'document';
  perform public.reader_set_document_category(identity,category);
 end if;
 insert into public.reader_link_sources(user_id,id,kind,original_url,resolved_url,title,mime_type,filename,size_bytes,sha256,tags,status)
 values(uid,identity,kind,p_source->>'original_url',p_source->>'resolved_url',p_source->>'title',p_source->>'mime_type',p_source->>'filename',(p_source->>'size_bytes')::bigint,digest,coalesce(p_source->'tags','[]'),case when kind='text' or is_duplicate then 'ready' else 'pending' end)
 returning * into entry;
 return jsonb_build_object('source',to_jsonb(entry),'target',target,'duplicate',is_duplicate);
end;$$;
create or replace function public.reader_finish_link_pdf(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); entry public.reader_link_sources;
begin
 if uid is null then raise exception 'Sign in required';end if;
 if not exists(select 1 from public.reader_pdfs where user_id=uid and id=p_id and status='ready' and not deleted) then raise exception 'PDF not ready';end if;
 update public.reader_link_sources set status='ready' where user_id=uid and id=p_id and kind='pdf' returning * into entry;
 if not found then raise exception 'Import unavailable';end if;return to_jsonb(entry);
end;$$;
revoke all on function public.reader_claim_link_fetch(),public.reader_import_link(jsonb,text),public.reader_finish_link_pdf(uuid) from public,anon;
grant execute on function public.reader_claim_link_fetch(),public.reader_import_link(jsonb,text),public.reader_finish_link_pdf(uuid) to authenticated;
commit;
