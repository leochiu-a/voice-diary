-- The diary is private: only listed emails can create an account. Each
-- environment fills its own list, which is kept out of this repository:
--   insert into public.allowed_emails (email) values ('you@gmail.com');
create table public.allowed_emails (
  email text primary key check (email = lower(email))
);

-- RLS with no policies: the Data API can neither read nor change the list.
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

-- "Before User Created" auth hook: Supabase Auth calls this before creating any
-- user, including Google sign-ups, and rejects the sign-up on an error result.
-- Security definer so it can read the list despite RLS.
create function public.restrict_signups(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.allowed_emails
    where email = lower(event->'user'->>'email')
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'This diary is private.')
  );
end;
$$;

-- Only Supabase Auth may call the hook.
revoke execute on function public.restrict_signups(jsonb) from public, anon, authenticated;
grant execute on function public.restrict_signups(jsonb) to supabase_auth_admin;
