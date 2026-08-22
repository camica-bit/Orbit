-- Close `user_id` on every user-owned table.
--
-- Run with:  supabase db push        (or psql -f against the project database)
--
-- Why this is needed: `/api/ai/extract` used to do `const userId = user?.id ?? null`
-- and carry on, so an unauthenticated request inserted rows with `user_id = NULL`.
-- Those rows are unreachable by design — every RLS policy compares `user_id` to
-- `auth.uid()`, and NULL never equals anything, so no user can read, edit, or
-- delete them. Not even the person who dictated them. They just accumulate.
--
-- The route returns 401 now, so no new orphans are being created. This closes the
-- column so the class of bug cannot come back through a future write path.

begin;

-- Deliberately destructive. NOT NULL cannot be added while these rows exist, and
-- they cannot be attributed to anyone or read by anyone, so there is nothing to
-- migrate them to. Count them first if you want a record before they go:
--   select count(*) from public.context_items where user_id is null;
--   select count(*) from public.sessions      where user_id is null;
--   select count(*) from public.tasks         where user_id is null;
--   select count(*) from public.transcripts   where user_id is null;
delete from public.context_items where user_id is null;
delete from public.sessions      where user_id is null;
delete from public.tasks         where user_id is null;
delete from public.transcripts   where user_id is null;

alter table public.context_items alter column user_id set not null;
alter table public.sessions      alter column user_id set not null;
alter table public.tasks         alter column user_id set not null;
alter table public.transcripts   alter column user_id set not null;

commit;

-- After applying, regenerate the TypeScript types so the two stay in step:
--   supabase gen types typescript --linked > src/lib/database.types.ts
-- `src/lib/database.types.ts` has been hand-updated to the post-migration shape
-- (`user_id: string`), so the compiler already assumes this file has been run.
