-- Garante que crypt()/gen_salt() (pgcrypto) ficam acessíveis no schema public.
-- Em alguns projetos o pgcrypto vive no schema "extensions"; aqui criamos wrappers
-- em public para a seed do bot TMT da migration seguinte poder usar crypt/gen_salt.
do $$
declare
  v_ext_schema text := null;
begin
  select n.nspname into v_ext_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if v_ext_schema is null then
    create extension pgcrypto with schema public;
    v_ext_schema := 'public';
    raise notice 'pgcrypto instalado em public';
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'gen_salt' and n.nspname = 'public'
  ) then
    execute format('create or replace function public.gen_salt(text) returns text language sql as $f$ select %I.gen_salt($1) $f$', v_ext_schema);
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'crypt' and n.nspname = 'public'
  ) then
    execute format('create or replace function public.crypt(text, text) returns text language sql as $f$ select %I.crypt($1, $2) $f$', v_ext_schema);
  end if;

  raise notice 'pgcrypto schema: %', v_ext_schema;
end $$;
