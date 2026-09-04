alter table public.channels add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.channels add column if not exists updated_at timestamptz default now();

create or replace function public.handle_channel_updated()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_channel_updated on public.channels;
create trigger trg_channel_updated before update on public.channels
  for each row execute function public.handle_channel_updated();

create policy "channels_update_admin" on public.channels
  for update to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'))
  with check (true);

create policy "channels_delete_admin" on public.channels
  for delete to authenticated
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));
