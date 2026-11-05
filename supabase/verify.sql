-- Run in a TEST reader project after schema.sql. Fixtures roll back.
-- Failure aborts the transaction; run ROLLBACK if your SQL client leaves it open.
begin;
insert into auth.users(id,email) values
 ('a1000000-0000-4000-8000-000000000001','reader-fixture-a@example.invalid'),
 ('b1000000-0000-4000-8000-000000000002','reader-fixture-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$
declare result jsonb;
begin
  result:=public.save_reader_document('c1000000-0000-4000-8000-000000000003','Article','中文','原文','note',false,0);
  if (result->>'conflict')::boolean or (result->'document'->>'revision')::int<>1 then raise exception 'Create failed'; end if;
  result:=public.save_reader_document('c1000000-0000-4000-8000-000000000003','Article','中文','edit','note',false,1);
  if (result->'document'->>'revision')::int<>2 then raise exception 'Revision failed'; end if;
  result:=public.save_reader_document('c1000000-0000-4000-8000-000000000003','Article','','stale','',false,1);
  if not (result->>'conflict')::boolean or result->'document'->>'content'<>'edit' then raise exception 'Stale write accepted'; end if;
  result:=public.save_reader_document('c1000000-0000-4000-8000-000000000003','Article','','edit','',true,2);
  if not (result->'document'->>'deleted')::boolean then raise exception 'Tombstone failed'; end if;
  if (select count(*) from public.reader_document_versions)<>3 then raise exception 'History failed'; end if;
  begin
    update public.reader_documents set content='bypass';
    raise exception 'Direct write accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
do $$
declare result jsonb;
begin
  if exists(select 1 from public.reader_documents) or exists(select 1 from public.reader_document_versions) then raise exception 'Account isolation failed'; end if;
  result:=public.save_reader_document('c1000000-0000-4000-8000-000000000003','B article','','B content','',false,0);
  if (result->'document'->>'user_id')<>'b1000000-0000-4000-8000-000000000002' then raise exception 'Owner binding failed'; end if;
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.save_reader_document('c1000000-0000-4000-8000-000000000003','Anon','','','',false,0);
    raise exception 'Anonymous RPC accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.reader_documents;
    raise exception 'Anonymous read accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
