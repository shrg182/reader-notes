-- Disposable fixtures exist only inside the rollback.
begin;
insert into auth.users(id,email) values
('a9100000-0000-4000-8000-000000000001','organize-a@example.invalid'),
('b9100000-0000-4000-8000-000000000002','organize-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','a9100000-0000-4000-8000-000000000001',true);
do $$ declare a uuid:='c9100000-0000-4000-8000-000000000001'; b uuid:='c9100000-0000-4000-8000-000000000002'; result jsonb;begin
 perform public.save_reader_document(a,'Placement fixture','','Original text','Private notes',false,0);
 perform public.save_reader_document(b,'Anchor fixture','','Anchor text','',false,0);
 result:=public.reader_move_library_items(array[a],'text','organize-fixture','Fixture category','fixture-collection','Fixture collection',b,'before',jsonb_build_object(a::text,0));
 if result->'placements'->0->>'collection_id'<>'fixture-collection' then raise exception 'Placement failed';end if;
 if not exists(select 1 from public.reader_documents where id=a and content='Original text' and notes='Private notes' and revision=1) then raise exception 'Content changed during move';end if;
 begin perform public.reader_move_library_items(array[b],'text','organize-fixture','Fixture category','fixture-collection','Fixture collection',a,'after',jsonb_build_object(b::text,0));raise exception 'Cycle accepted';exception when others then if SQLERRM not like '%cycle%' then raise;end if;end;
 begin update public.reader_library_placements set collection_title='Forged';raise exception 'Direct write accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','b9100000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.reader_library_placements) then raise exception 'Cross-account read';end if;
 begin perform public.reader_move_library_items(array['c9100000-0000-4000-8000-000000000001'::uuid],'text','organize-fixture','Fixture category','','',null,'end','{}');raise exception 'Cross-account move accepted';exception when others then if SQLERRM not like '%unavailable%' and SQLERRM not like '%another device%' then raise;end if;end;
end $$;
reset role;set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform * from public.reader_library_placements;raise exception 'Anonymous read accepted';exception when insufficient_privilege then null;end;
 begin perform public.reader_move_library_items('{}','text','x','x','','',null,'end','{}');raise exception 'Anonymous move accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;rollback;
select (select count(*) from auth.users where id in('a9100000-0000-4000-8000-000000000001','b9100000-0000-4000-8000-000000000002')) as fixtures_left,(select relrowsecurity from pg_class where oid='public.reader_library_placements'::regclass) as rls_enabled,has_table_privilege('anon','public.reader_library_placements','select') as anon_read;
