-- NUL escapes are normalized only in the temporary metadata projection; stored
-- preservation payloads remain byte-for-byte unchanged.
-- Metadata projection only; security_invoker retains the base table's owner RLS.
create or replace view public.reader_import_index with (security_invoker=true) as
 select id,kind,title,book_id,fingerprint,
 (case when kind='edition' then (case when payload->>'encoding'='json-text-v1' then replace(payload->>'data',chr(92)||'u0000',chr(92)||'uFFFD')::jsonb else payload end) else '{}'::jsonb end)->>'path' as source_path,
 (case when kind='edition' then (case when payload->>'encoding'='json-text-v1' then replace(payload->>'data',chr(92)||'u0000',chr(92)||'uFFFD')::jsonb else payload end) else '{}'::jsonb end)->>'sourceKey' as source_key,
 (case when kind='edition' then (case when payload->>'encoding'='json-text-v1' then replace(payload->>'data',chr(92)||'u0000',chr(92)||'uFFFD')::jsonb else payload end) else '{}'::jsonb end)->>'edition' as edition
 from public.reader_import_records;
revoke all on public.reader_import_index from public,anon,authenticated;
grant select on public.reader_import_index to authenticated;
