drop policy if exists "channels_insert_admin_premium" on public.channels;
create policy "channels_insert_admin_premium" on public.channels
  for insert to authenticated
  with check (
    auth.uid() = '11111111-1111-1111-1111-111111111111'::uuid
    or exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'admin'
    )
    or public.is_premium(auth.uid())
  );
