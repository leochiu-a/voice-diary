-- Free-form tags on entries. The app trims and de-duplicates them before saving.
alter table public.entries add column tags text[] not null default '{}';

-- Filtering by tag uses `tags @> array[...]`, which a GIN index serves.
create index entries_tags_idx on public.entries using gin (tags);
