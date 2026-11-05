-- Run AFTER schema.sql and sharing.sql in a dedicated TEST project.
-- No emails are sent. All fixtures roll back and never become public commits.
begin;
insert into auth.users(id,email) values
 ('a4000000-0000-4000-8000-000000000001','sharing-fixture-a@example.invalid'),
 ('b4000000-0000-4000-8000-000000000002','sharing-fixture-b@example.invalid'),
 ('c4000000-0000-4000-8000-000000000003','sharing-fixture-c@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);
do $$ declare result jsonb; grp jsonb; invitation jsonb; begin
  perform public.save_reader_document('d4000000-0000-4000-8000-000000000004','Sharing fixture','en','A🙂字 B','PRIVATE BOOK NOTES',false,0);
  result:=public.reader_publish_book('d4000000-0000-4000-8000-000000000004',1,'public','{}',0);
  if result->'publication'?'notes' then raise exception 'Private notes leaked into publication'; end if;
  perform set_config('reader.fixture.source',result->'publication'->>'id',true);
  grp:=public.reader_create_group('Fixture group','Fixture organizer');
  perform set_config('reader.fixture.group',grp->>'id',true);
  invitation:=public.reader_invite_group((grp->>'id')::uuid);
  perform set_config('reader.fixture.code',invitation->>'code',true);
end $$;
select set_config('request.jwt.claim.sub','b4000000-0000-4000-8000-000000000002',true);
do $$ declare source uuid:=current_setting('reader.fixture.source')::uuid; begin
  perform public.reader_join_group(current_setting('reader.fixture.code'),'Fixture friend');
  perform public.reader_save_contribution('e4000000-0000-4000-8000-000000000005',source,'pinyin','PRIVATE PINYIN','🙂字',1,3,1,'private','{}',0);
  perform public.reader_save_contribution('f4000000-0000-4000-8000-000000000006',source,'footnote','Public footnote','🙂字',1,3,1,'public','{}',0);
  perform public.reader_publish_contribution('f4000000-0000-4000-8000-000000000006',1,0);
  perform public.reader_save_contribution('f4000000-0000-4000-8000-000000000006',source,'footnote','PRIVATE LATER DRAFT','🙂字',1,3,1,'private','{}',1);
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if (select count(*) from public.reader_publications)<>1 then raise exception 'Public source unavailable'; end if;
  if (select count(*) from public.reader_shared_contributions)<>1 or (select body from public.reader_shared_contributions)<>'Public footnote' then raise exception 'Draft replaced its public snapshot'; end if;
  begin perform * from public.reader_contribution_drafts;raise exception 'Anonymous draft read accepted';exception when insufficient_privilege then null;end;
  begin update public.reader_publications set content='bypass';raise exception 'Anonymous source write accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);
do $$ begin
  if exists(select 1 from public.reader_contribution_drafts) then raise exception 'Source owner accessed another reader private draft'; end if;
  perform public.reader_publish_book('d4000000-0000-4000-8000-000000000004',1,'group',array[current_setting('reader.fixture.group')::uuid],1);
end $$;
select set_config('request.jwt.claim.sub','c4000000-0000-4000-8000-000000000003',true);
do $$ begin
  if exists(select 1 from public.reader_publications) or exists(select 1 from public.reader_shared_contributions) then raise exception 'Nonmember accessed group source/contributions'; end if;
end $$;
select set_config('request.jwt.claim.sub','b4000000-0000-4000-8000-000000000002',true);
do $$ declare source uuid:=current_setting('reader.fixture.source')::uuid; begin
  if (select count(*) from public.reader_publications)<>1 then raise exception 'Member cannot read group source'; end if;
  perform public.reader_save_contribution('f4000000-0000-4000-8000-000000000006',source,'footnote','Too broad','🙂字',1,3,2,'public','{}',2);
  begin
    perform public.reader_publish_contribution('f4000000-0000-4000-8000-000000000006',3,1);
    raise exception 'Unexpectedly published beyond source audience';
  exception when others then
    if SQLERRM not like '%exceeds source audience%' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);
select public.reader_remove_member(current_setting('reader.fixture.group')::uuid,'b4000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','b4000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.reader_publications) then raise exception 'Removed member still has source access'; end if;
  if (select count(*) from public.reader_contribution_drafts)<>2 then raise exception 'Reader lost their independently owned notes'; end if;
end $$;
reset role;
rollback;
