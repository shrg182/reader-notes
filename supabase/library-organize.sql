-- Additive, owner-only placement metadata. Reader Notes project only.
begin;
create table if not exists public.reader_library_placements(
 user_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid not null,kind text not null check(kind in ('text','pdf')),
 category_id text not null,collection_id text not null default '' check(length(collection_id)<=100),
 collection_title text not null default '' check(length(collection_title)<=120),
 anchor_id uuid,side text not null check(side in ('before','after','end')),
 revision bigint not null default 1,updated_at timestamptz not null default now(),
 primary key(user_id,document_id),foreign key(user_id,category_id) references public.reader_categories(user_id,id),
 check((side='end' and anchor_id is null) or (side<>'end' and anchor_id is not null)),
 check(anchor_id is null or anchor_id<>document_id),
 check((collection_id='' and collection_title='') or (collection_id<>'' and length(btrim(collection_title))>0))
);
alter table public.reader_library_placements enable row level security;
create policy reader_own_library_placements on public.reader_library_placements for select to authenticated using((select auth.uid())=user_id);
revoke all on public.reader_library_placements from public,anon,authenticated;
grant select on public.reader_library_placements to authenticated;
create or replace function public.reader_move_library_items(p_ids uuid[],p_kind text,p_category text,p_category_title text,p_collection text,p_collection_title text,p_anchor uuid,p_side text,p_expected jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); item_id uuid; current_revision bigint; anchor uuid:=p_anchor; visited uuid[]:='{}'; item public.reader_pdfs; placements jsonb:='[]'; result public.reader_library_placements; pdf_result jsonb:=null;
begin
 if uid is null then raise exception 'Sign in required';end if;
 if p_ids is null or cardinality(p_ids) not between 1 and 200 or array_position(p_ids,null) is not null or cardinality(p_ids)<>(select count(distinct x) from unnest(p_ids) x) or p_kind is null or p_kind not in ('text','pdf')
 or p_side is null or p_side not in ('before','after','end') or p_collection is null or p_collection_title is null or p_expected is null or jsonb_typeof(p_expected)<>'object'
 or ((p_side='end')<>(p_anchor is null)) or (p_kind='pdf' and cardinality(p_ids)<>1) then raise exception 'Invalid Library placement';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':library-placement',0));
 if p_anchor=any(p_ids) then raise exception 'An article cannot be placed relative to itself';end if;
 if p_anchor is not null and not exists(select 1 from public.reader_documents where user_id=uid and id=p_anchor and not deleted)
 and not exists(select 1 from public.reader_pdfs where user_id=uid and id=p_anchor and not deleted and status='ready') then raise exception 'Reference article is unavailable';end if;
 while anchor is not null loop
  if anchor=any(p_ids) or anchor=any(visited) or cardinality(visited)>1000 then raise exception 'This placement would create a position cycle';end if;
  visited:=array_append(visited,anchor);
  select anchor_id into anchor from public.reader_library_placements where user_id=uid and document_id=anchor and category_id=p_category and collection_id=p_collection;
 end loop;
 foreach item_id in array p_ids loop
  select revision into current_revision from public.reader_library_placements where user_id=uid and document_id=item_id;
  if coalesce(current_revision,0)<>coalesce((p_expected->>item_id::text)::bigint,-1) then raise exception 'Placement changed on another device. Refresh and retry';end if;
  if p_kind='text' and not exists(select 1 from public.reader_documents where user_id=uid and reader_documents.id=item_id and not deleted) then raise exception 'Article unavailable';end if;
  if p_kind='pdf' and not exists(select 1 from public.reader_pdfs where user_id=uid and reader_pdfs.id=item_id and not deleted and status='ready') then raise exception 'PDF unavailable';end if;
 end loop;
 perform public.reader_save_category(p_category,p_category_title);
 foreach item_id in array p_ids loop
  if p_kind='text' then perform public.reader_set_document_category(item_id,p_category);
  else select * into item from public.reader_pdfs where user_id=uid and reader_pdfs.id=item_id for update;
   pdf_result:=public.reader_change_pdf(item_id,item.revision,'update',jsonb_build_object('category_id',p_category));
  end if;
  insert into public.reader_library_placements(user_id,document_id,kind,category_id,collection_id,collection_title,anchor_id,side)
  values(uid,item_id,p_kind,p_category,p_collection,p_collection_title,p_anchor,p_side)
  on conflict(user_id,document_id) do update set kind=excluded.kind,category_id=excluded.category_id,collection_id=excluded.collection_id,collection_title=excluded.collection_title,anchor_id=excluded.anchor_id,side=excluded.side,revision=reader_library_placements.revision+1,updated_at=clock_timestamp()
  returning * into result;
  placements:=placements||jsonb_build_array(to_jsonb(result));
 end loop;
 return jsonb_build_object('placements',placements,'pdf',pdf_result);
end;$$;
revoke all on function public.reader_move_library_items(uuid[],text,text,text,text,text,uuid,text,jsonb) from public,anon;
grant execute on function public.reader_move_library_items(uuid[],text,text,text,text,text,uuid,text,jsonb) to authenticated;
commit;
