create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'other' check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'acted')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.message_reports enable row level security;

create policy "reports_insert_own" on public.message_reports
  for insert to authenticated with check (reporter_id = auth.uid());

create policy "reports_select_own" on public.message_reports
  for select to authenticated using (reporter_id = auth.uid());

create policy "reports_all_service" on public.message_reports
  for all to service_role using (true) with check (true);

create policy "reports_select_admin" on public.message_reports
  for select to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "reports_update_admin" on public.message_reports
  for update to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'))
  with check (true);

create index if not exists idx_reports_status on public.message_reports (status);
create index if not exists idx_reports_message on public.message_reports (message_id);
create index if not exists idx_reports_created on public.message_reports (created_at desc);
