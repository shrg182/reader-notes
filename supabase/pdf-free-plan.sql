-- Free-plan cloud PDFs: raise the application/bucket limit to 50 MiB.
-- This does not change the Supabase subscription or any access policy.
begin;
alter table public.reader_pdfs drop constraint reader_pdfs_size_bytes_check;
alter table public.reader_pdfs add constraint reader_pdfs_size_bytes_check check(size_bytes between 0 and 52428800);
update storage.buckets set file_size_limit=52428800 where id='reader-pdfs' and public=false;
commit;
