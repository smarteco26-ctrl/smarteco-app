-- Sécurisation de la table plans (elle n'avait pas de RLS jusqu'ici)
alter table plans enable row level security;

create policy if not exists "Lecture publique plans" on plans
  for select using (true);

revoke insert, update, delete on plans from anon, authenticated;
