begin;
alter table public.reader_documents add column rich_state text check(octet_length(rich_state)<=40000000);
create function public.reader_clear_stale_rich_state() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.content is distinct from old.content and new.rich_state is not distinct from old.rich_state then new.rich_state=null;end if;
 return new;
end;
$$;
revoke all on function public.reader_clear_stale_rich_state() from public,anon,authenticated;
create trigger reader_plain_edit before update of content on public.reader_documents for each row execute function public.reader_clear_stale_rich_state();
create function public.save_reader_rich_document(p_document jsonb,p_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb; doc public.reader_documents; rich text:=p_document->>'richState';
begin
 if uid is null then raise exception 'Sign in required';end if;
 if rich is null or octet_length(rich)>40000000 then raise exception 'Invalid rich edition';end if;
 -- Store as text: original annotation keys can contain NUL separators.
 perform rich::json;
 if rich not like '{"format":"reader-notes-rich-v1","state":%' then raise exception 'Unsupported rich edition';end if;
 result:=public.save_reader_document((p_document->>'id')::uuid,p_document->>'title',p_document->>'language',p_document->>'content',p_document->>'notes',(p_document->>'deleted')::boolean,p_revision);
 if (result->>'conflict')::boolean then return result;end if;
 update public.reader_documents set rich_state=rich where user_id=uid and id=(p_document->>'id')::uuid returning * into doc;
 update public.reader_document_versions set edition=to_jsonb(doc) where user_id=uid and document_id=doc.id and revision=doc.revision;
 return jsonb_build_object('conflict',false,'document',to_jsonb(doc));
end;
$$;
revoke all on function public.save_reader_rich_document(jsonb,bigint) from public,anon;
grant execute on function public.save_reader_rich_document(jsonb,bigint) to authenticated;
commit;
