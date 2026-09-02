create table if not exists public.whatsapp_otp (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_otp_phone_idx
  on public.whatsapp_otp (phone, created_at desc);

alter table public.whatsapp_otp enable row level security;

create policy "service_role can manage whatsapp_otp"
  on public.whatsapp_otp
  for all
  to service_role
  using (true)
  with check (true);
