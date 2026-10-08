-- ============================================================================
-- STORE PRODUCTS SEATS (escassez real)
-- capacity = vagas totais; seats_left = vagas restantes. Só fazem sentido em
-- mentorias (turmas limitadas); NULL em bots/ebooks = sem limite, sem UI.
-- Os valores são mantidos pela equipa no dashboard conforme as vendas.
-- ============================================================================

alter table public.store_products
  add column if not exists capacity integer,
  add column if not exists seats_left integer;

-- Seed inicial coerente com o catálogo atual
update public.store_products
set capacity = 12, seats_left = 4
where slug = 'mentoria-individual';

update public.store_products
set capacity = 40, seats_left = 18
where slug = 'mentoria-grupo';

-- Coerência: ambas as colunas nulas (sem limite) ou ambas preenchidas e válidas
alter table public.store_products
  drop constraint if exists chk_sp_seats;

alter table public.store_products
  add constraint chk_sp_seats check (
    (capacity is null and seats_left is null)
    or (capacity is not null and seats_left is not null and seats_left between 0 and capacity)
  );