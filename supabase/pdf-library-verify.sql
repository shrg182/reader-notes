-- Live policy verification. Disposable fixtures exist only inside this rollback.
begin;
insert into auth.users(id,email) values
 ('a8000000-0000-4000-8000-000000000001','pdf-fixture-a@example.invalid'),
 ('b8000000-0000-4000-8000-000000000002','pdf-fixture-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','a8000000-0000-4000-8000-000000000001',true);
do $$ declare item jsonb;begin
 perform public.reader_save_category('pdf-fixture','PDF fixture');
 item:=public.reader_reserve_pdf('c8000000-0000-4000-8000-000000000003','PDF fixture','pdf-fixture','fixture.pdf',12,repeat('a',64));
 if item->>'object_path'<>'a8000000-0000-4000-8000-000000000001/c8000000-0000-4000-8000-000000000003.pdf' then raise exception 'Owner path mismatch';end if;
 if (select count(*) from public.reader_pdfs)<>1 then raise exception 'Owner cannot read PDF';end if;
 begin perform public.reader_change_pdf('c8000000-0000-4000-8000-000000000003',1,'finish_upload');raise exception 'Incomplete upload accepted';exception when others then if SQLERRM not like '%upload incomplete%' then raise;end if;end;
 begin update public.reader_pdfs set deleted=true;raise exception 'Direct write accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','b8000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.reader_pdfs) or exists(select 1 from public.reader_categories) then raise exception 'Cross-account read accepted';end if;
 if exists(select 1 from storage.objects where bucket_id='reader-pdfs') then raise exception 'Cross-account storage read accepted';end if;
 begin perform public.reader_change_pdf('c8000000-0000-4000-8000-000000000003',1,'trash');raise exception 'Cross-account mutation accepted';exception when others then if SQLERRM not like '%PDF unavailable%' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','a8000000-0000-4000-8000-000000000001',true);
do $$ declare item jsonb;begin
 perform public.reader_change_pdf('c8000000-0000-4000-8000-000000000003',1,'trash');
 perform public.reader_change_pdf('c8000000-0000-4000-8000-000000000003',2,'begin_delete');
 item:=public.reader_change_pdf('c8000000-0000-4000-8000-000000000003',3,'finish_delete');
 if item->>'status'<>'purged' or item->>'notes'<>'' then raise exception 'Purge failed';end if;
 begin perform public.reader_change_pdf('c8000000-0000-4000-8000-000000000003',4,'restore');raise exception 'Purged PDF restored';exception when others then if SQLERRM not like '%permanently deleted%' then raise;end if;end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform * from public.reader_pdfs;raise exception 'Anonymous PDF read accepted';exception when insufficient_privilege then null;end;
 begin perform public.reader_save_category('anon-fixture','Anonymous');raise exception 'Anonymous RPC accepted';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='reader-pdfs') then raise exception 'Anonymous storage read accepted';end if;
end $$;
reset role;
rollback;
select jsonb_build_object('bucket',(select jsonb_build_object('private',not public,'limit',file_size_limit,'mime_types',allowed_mime_types) from storage.buckets where id='reader-pdfs'),'storage_policy_count',(select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('reader_pdf_upload','reader_pdf_read','reader_pdf_remove')),'fixture_users_left',(select count(*) from auth.users where id in ('a8000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000002'))) as verification;
