-- Additive cloud PDF library. Install in the existing Reader Notes project.
begin;
create table public.reader_categories(
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(id ~ '^[a-zA-Z0-9_-]{1,80}$'),
 title text not null check(length(btrim(title)) between 1 and 120),
 created_at timestamptz not null default now(),
 primary key(user_id,id),unique(user_id,title)
);
create table public.reader_document_categories(
 user_id uuid not null,document_id uuid not null,category_id text not null,
 primary key(user_id,document_id),
 foreign key(user_id,document_id) references public.reader_documents(user_id,id) on delete cascade,
 foreign key(user_id,category_id) references public.reader_categories(user_id,id)
);
create table public.reader_pdfs(
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null, title text not null check(length(btrim(title)) between 1 and 200),
 category_id text not null,filename text not null check(length(filename)<=255),
 size_bytes bigint not null check(size_bytes between 0 and 26214400),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 object_path text generated always as (user_id::text||'/'||id::text||'.pdf') stored,
 status text not null default 'uploading' check(status in ('uploading','ready','deleting','purged')),
 notes text not null default '' check(length(notes)<=1000000),
 last_page integer not null default 1 check(last_page between 1 and 100000),
 completed boolean not null default false,deleted boolean not null default false,
 revision bigint not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(user_id,id),foreign key(user_id,category_id) references public.reader_categories(user_id,id)
);
alter table public.reader_categories enable row level security;
alter table public.reader_document_categories enable row level security;
alter table public.reader_pdfs enable row level security;
create policy reader_categories_owner on public.reader_categories for select to authenticated using(user_id=(select auth.uid()));
create policy reader_document_categories_owner on public.reader_document_categories for select to authenticated using(user_id=(select auth.uid()));
create policy reader_pdfs_owner on public.reader_pdfs for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.reader_categories,public.reader_document_categories,public.reader_pdfs from public,anon,authenticated;
grant select on public.reader_categories,public.reader_document_categories,public.reader_pdfs to authenticated;

create function public.reader_save_category(p_id text,p_title text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result public.reader_categories;
begin
 if uid is null then raise exception 'Sign in required';end if;
 -- Category names are stable identifiers. Reusing an existing category never renames it.
 insert into public.reader_categories(user_id,id,title) values(uid,p_id,btrim(p_title)) on conflict(user_id,id) do nothing;
 select * into result from public.reader_categories where user_id=uid and id=p_id;
 return to_jsonb(result);
end;$$;
create function public.reader_set_document_category(p_id uuid,p_category text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required';end if;
 if not exists(select 1 from public.reader_documents where user_id=uid and id=p_id) then raise exception 'Sync this article before assigning a category';end if;
 insert into public.reader_document_categories values(uid,p_id,p_category) on conflict(user_id,document_id) do update set category_id=excluded.category_id;
end;$$;
create function public.reader_reserve_pdf(p_id uuid,p_title text,p_category text,p_filename text,p_size bigint,p_sha256 text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result public.reader_pdfs;
begin
 if uid is null then raise exception 'Sign in required';end if;
 if p_size is null or p_size<1 then raise exception 'Empty PDF';end if;
 insert into public.reader_pdfs(user_id,id,title,category_id,filename,size_bytes,sha256) values(uid,p_id,p_title,p_category,p_filename,p_size,p_sha256) on conflict(user_id,id) do nothing;
 select * into result from public.reader_pdfs where user_id=uid and id=p_id;
 if result.sha256<>p_sha256 or result.size_bytes<>p_size or result.status<>'uploading' or result.deleted then raise exception 'This upload is unavailable. Refresh the library';end if;
 return to_jsonb(result);
end;$$;
create function public.reader_change_pdf(p_id uuid,p_revision bigint,p_action text,p_patch jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); doc public.reader_pdfs;
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into doc from public.reader_pdfs where user_id=uid and id=p_id for update;
 if not found then raise exception 'PDF unavailable';end if;
 if doc.revision<>p_revision then raise exception 'PDF changed on another device. Refresh and retry';end if;
 if doc.status='purged' then raise exception 'PDF permanently deleted';end if;
 if p_action='update' then
  if doc.status<>'ready' or doc.deleted then raise exception 'Restore the PDF before editing';end if;
  update public.reader_pdfs set title=coalesce(p_patch->>'title',title),category_id=coalesce(p_patch->>'category_id',category_id),notes=coalesce(p_patch->>'notes',notes),last_page=coalesce((p_patch->>'last_page')::integer,last_page),completed=coalesce((p_patch->>'completed')::boolean,completed) where user_id=uid and id=p_id;
 elsif p_action='trash' then
  if doc.status not in ('ready','uploading') then raise exception 'Deletion in progress';end if;
  update public.reader_pdfs set deleted=true where user_id=uid and id=p_id;
 elsif p_action='restore' then
  if doc.status<>'ready' then raise exception 'Only completed uploads can be restored';end if;
  update public.reader_pdfs set deleted=false where user_id=uid and id=p_id;
 elsif p_action='finish_upload' then
  if doc.status<>'uploading' or doc.deleted then raise exception 'Upload unavailable';end if;
  if not exists(select 1 from storage.objects where bucket_id='reader-pdfs' and name=doc.object_path and (metadata->>'size')::bigint=doc.size_bytes) then raise exception 'PDF upload incomplete';end if;
  update public.reader_pdfs set status='ready' where user_id=uid and id=p_id;
 elsif p_action='begin_delete' then
  if not doc.deleted then raise exception 'Move the PDF to trash first';end if;
  update public.reader_pdfs set status='deleting' where user_id=uid and id=p_id;
 elsif p_action='finish_delete' then
  if doc.status<>'deleting' then raise exception 'Deletion was not started';end if;
  if exists(select 1 from storage.objects where bucket_id='reader-pdfs' and name=doc.object_path) then raise exception 'Remove the stored file before finalizing deletion';end if;
  -- Keep only a tombstone so a stale device can never restore the document.
  update public.reader_pdfs set status='purged',title='Deleted PDF',filename='',size_bytes=0,notes='',last_page=1,completed=false,sha256=repeat('0',64) where user_id=uid and id=p_id;
 else raise exception 'Unknown PDF operation';end if;
 update public.reader_pdfs set revision=revision+1,updated_at=clock_timestamp() where user_id=uid and id=p_id returning * into doc;
 return to_jsonb(doc);
end;$$;
revoke all on function public.reader_save_category(text,text),public.reader_set_document_category(uuid,text),public.reader_reserve_pdf(uuid,text,text,text,bigint,text),public.reader_change_pdf(uuid,bigint,text,jsonb) from public,anon;
grant execute on function public.reader_save_category(text,text),public.reader_set_document_category(uuid,text),public.reader_reserve_pdf(uuid,text,text,text,bigint,text),public.reader_change_pdf(uuid,bigint,text,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('reader-pdfs','reader-pdfs',false,26214400,array['application/pdf']);
create policy reader_pdf_upload on storage.objects for insert to authenticated with check(
 bucket_id='reader-pdfs' and exists(select 1 from public.reader_pdfs p where p.user_id=(select auth.uid()) and p.object_path=name and p.status='uploading' and not p.deleted)
);
create policy reader_pdf_read on storage.objects for select to authenticated using(
 bucket_id='reader-pdfs' and exists(select 1 from public.reader_pdfs p where p.user_id=(select auth.uid()) and p.object_path=name and p.status in ('ready','deleting','uploading'))
);
-- No UPDATE policy: uploaded PDF bytes are immutable, never overwritten.
create policy reader_pdf_remove on storage.objects for delete to authenticated using(
 bucket_id='reader-pdfs' and exists(select 1 from public.reader_pdfs p where p.user_id=(select auth.uid()) and p.object_path=name and p.status='deleting' and p.deleted)
);
notify pgrst,'reload schema';
commit;
