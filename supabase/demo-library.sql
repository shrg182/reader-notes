-- Install in Reader Notes zkffujfbzbxoexohcmwk only. No sharing is enabled by installation.
begin;
create table public.reader_demo_items(
 owner_id uuid not null references auth.users(id) on delete cascade,
 viewer_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid not null,kind text not null check(kind in ('text','pdf')),
 title text not null,language text not null default '',content text,
 category_id text,category_title text,collection_id text,collection_title text,
 source_path text,source_key text,edition text,source_url text,
 object_path text,source_revision bigint not null,created_at timestamptz not null default now(),
 primary key(owner_id,viewer_id,document_id),check(owner_id<>viewer_id),
 check((kind='pdf' and object_path is not null and content is null) or (kind='text' and object_path is null and content is not null))
);
alter table public.reader_demo_items enable row level security;
revoke all on public.reader_demo_items from public,anon,authenticated;
-- Return a fixed projection; never expose owner notes, rich state, progress, hashes or auth data.
create function public.reader_demo_catalog() returns setof public.reader_demo_items
language sql stable security definer set search_path='' as $$
 select s.* from public.reader_demo_items s where viewer_id=(select auth.uid()) and (
 (kind='text' and exists(select 1 from public.reader_documents d where d.user_id=s.owner_id and d.id=s.document_id and not d.deleted)) or
 (kind='pdf' and exists(select 1 from public.reader_pdfs p where p.user_id=s.owner_id and p.id=s.document_id and not p.deleted and p.status='ready' and p.object_path=s.object_path)));
$$;
create function public.reader_demo_pdf_allowed(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.reader_demo_items s join public.reader_pdfs p on p.user_id=s.owner_id and p.id=s.document_id where s.viewer_id=(select auth.uid()) and s.kind='pdf' and s.object_path=p_name and p.object_path=p_name and not p.deleted and p.status='ready');
$$;
create policy reader_demo_pdf_read on storage.objects for select to authenticated using(bucket_id='reader-pdfs' and public.reader_demo_pdf_allowed(name));
-- Explicit owner action snapshots current active text and grants current ready PDF reads.
-- Subsequent uploads and edits are NOT automatically shared. Re-granting replaces this viewer's snapshot.
create function public.reader_grant_demo(p_viewer uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); text_count integer;pdf_count integer;
begin
 if uid is null or p_viewer is null or uid=p_viewer or not exists(select 1 from auth.users where id=p_viewer) then raise exception 'Invalid demo account';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':demo:'||p_viewer::text,0));
 delete from public.reader_demo_items where owner_id=uid and viewer_id=p_viewer;
 insert into public.reader_demo_items(owner_id,viewer_id,document_id,kind,title,language,content,category_id,category_title,collection_id,collection_title,source_path,source_key,edition,source_url,source_revision)
 select uid,p_viewer,d.id,'text',d.title,d.language,d.content,coalesce(p.category_id,a.category_id),c.title,p.collection_id,p.collection_title,rec.data->>'path',rec.data->>'sourceKey',rec.data->>'edition',l.original_url,d.revision
 from public.reader_documents d left join public.reader_library_placements p on p.user_id=uid and p.document_id=d.id
 left join public.reader_document_categories a on a.user_id=uid and a.document_id=d.id
 left join public.reader_categories c on c.user_id=uid and c.id=coalesce(p.category_id,a.category_id)
 left join lateral(select case when r.payload->>'encoding'='json-text-v1' then replace(r.payload->>'data',chr(92)||'u0000',chr(92)||'uFFFD')::jsonb else r.payload end data from public.reader_import_records r where r.owner_id=uid and r.book_id=d.id and r.kind='edition' order by r.created_at desc,r.id limit 1) rec on true
 left join public.reader_link_sources l on l.user_id=uid and l.id=d.id
 where d.user_id=uid and not d.deleted;
 get diagnostics text_count=row_count;
 insert into public.reader_demo_items(owner_id,viewer_id,document_id,kind,title,language,category_id,category_title,collection_id,collection_title,object_path,source_revision)
 select uid,p_viewer,d.id,'pdf',d.title,'',d.category_id,c.title,p.collection_id,p.collection_title,d.object_path,d.revision
 from public.reader_pdfs d left join public.reader_categories c on c.user_id=uid and c.id=d.category_id left join public.reader_library_placements p on p.user_id=uid and p.document_id=d.id
 where d.user_id=uid and not d.deleted and d.status='ready';
 get diagnostics pdf_count=row_count;
 return jsonb_build_object('text_editions',text_count,'pdfs',pdf_count);
end;$$;
create function public.reader_demo_grants() returns table(viewer_id uuid,text_editions bigint,pdfs bigint) language sql stable security definer set search_path='' as $$select viewer_id,count(*) filter(where kind='text'),count(*) filter(where kind='pdf') from public.reader_demo_items where owner_id=(select auth.uid()) group by viewer_id;$$;
create function public.reader_revoke_demo(p_viewer uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 delete from public.reader_demo_items where owner_id=auth.uid() and viewer_id=p_viewer;
end;$$;
revoke all on function public.reader_demo_catalog(),public.reader_demo_grants(),public.reader_demo_pdf_allowed(text),public.reader_grant_demo(uuid),public.reader_revoke_demo(uuid) from public,anon;
grant execute on function public.reader_demo_catalog(),public.reader_demo_grants(),public.reader_demo_pdf_allowed(text),public.reader_grant_demo(uuid),public.reader_revoke_demo(uuid) to authenticated;
commit;
