-- The home page's cached reads (src/lib/journal-data.ts) can't act as the user,
-- so they read with the secret key, as service_role, filtering by user id
-- themselves. Reading is all they need; writes stay with the signed-in user.
grant select on public.entries, public.recordings to service_role;
