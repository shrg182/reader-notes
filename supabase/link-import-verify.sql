-- Live owner isolation verification: every fixture is rolled back.
begin;
insert into auth.users(id,email) values
('a9000000-0000-4000-8000-000000000001','link-fixture-a@example.invalid'),
('b9000000-0000-4000-8000-000000000002','link-fixture-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000001',true);
do $$ declare saved jsonb; duplicate jsonb; payload jsonb:=jsonb_build_object('kind','text','sha256',repeat('d',64),'category','link-fixture','category_title','Link fixture','title','Link verification fixture','filename','fixture.txt','mime_type','text/plain','size_bytes',12,'original_url','https://example.com/fixture.txt','resolved_url','https://example.com/fixture.txt','tags','[]'::jsonb);begin
 saved:=public.reader_import_link(payload,'Fixture body');
 if saved->'source'->>'status'<>'ready' or (saved->>'duplicate')::boolean then raise exception 'Import failed';end if;
 perform public.save_reader_document((saved->'target'->>'id')::uuid,'Edited fixture','','User-edited body','Private fixture notes',false,1);
 duplicate:=public.reader_import_link(payload,'Must not overwrite');
 if not (duplicate->>'duplicate')::boolean or duplicate->'target'->>'notes'<>'Private fixture notes' or duplicate->'target'->>'content'<>'User-edited body' then raise exception 'Duplicate overwrote data';end if;
 if (select count(*) from public.reader_link_sources)<>1 then raise exception 'Owner read failed';end if;
 begin update public.reader_link_sources set title='Forged';raise exception 'Direct write accepted';exception when insufficient_privilege then null;end;
 perform public.reader_claim_link_fetch();
end $$;
select set_config('request.jwt.claim.sub','b9000000-0000-4000-8000-000000000002',true);
do $$ begin if exists(select 1 from public.reader_link_sources) then raise exception 'Cross-account read accepted';end if;end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform * from public.reader_link_sources;raise exception 'Anonymous read accepted';exception when insufficient_privilege then null;end;
 begin perform public.reader_import_link('{}','test');raise exception 'Anonymous import accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select (select count(*) from auth.users where id in('a9000000-0000-4000-8000-000000000001','b9000000-0000-4000-8000-000000000002')) as fixture_users_left,(select public from storage.buckets where id='reader-pdfs') as pdf_bucket_public;
