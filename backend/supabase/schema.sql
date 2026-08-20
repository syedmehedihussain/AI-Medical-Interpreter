-- Saved consultation reports for the AI Medical Interpreter (v0.2 accounts).
-- Run this once in the Supabase project's SQL editor.
--
-- Stores exactly what the prescription PDF contains: the dialogue transcript,
-- the AI summary, and the confirmed medications. No audio is ever stored.

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  title         text  not null default '',
  language_pair text  not null default '',
  summary       text  not null default '',
  transcript    jsonb not null default '[]'::jsonb,   -- [{speaker, sourceText, translatedText, sourceLang, targetLang}]
  medications   jsonb not null default '[]'::jsonb    -- [{name, dosage, timesPerDay, timing}]
);

-- The history list queries a user's rows newest-first.
create index if not exists reports_user_created_idx
  on public.reports (user_id, created_at desc);

-- Row-Level Security: owner-only. The backend talks to PostgREST with the
-- service-role key (which bypasses RLS) and filters by user_id itself, so these
-- policies are defence in depth -- even with the public anon key, a user can
-- only ever read or change their own rows.
alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own" on public.reports
  for delete using (auth.uid() = user_id);
