-- Metadata projection only; security_invoker retains the base table's owner RLS.
create view public.reader_import_index with (security_invoker=true) as
 select id,kind,title,book_id,fingerprint,
 (case when payload->>'encoding'='json-text-v1' then (payload->>'data')::jsonb else payload end)->>'path' as source_path,
 (case when payload->>'encoding'='json-text-v1' then (payload->>'data')::jsonb else payload end)->>'sourceKey' as source_key,
 (case when payload->>'encoding'='json-text-v1' then (payload->>'data')::jsonb else payload end)->>'edition' as edition
 from public.reader_import_records;
revoke all on public.reader_import_index from public,anon,authenticated;
grant select on public.reader_import_index to authenticated;
