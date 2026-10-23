-- Entries no longer have titles. Keep any existing title by moving it to the
-- top of the body, then drop the column.
update public.entries
set body = case when body = '' then title else title || E'\n\n' || body end
where title <> '';

alter table public.entries drop column title;
