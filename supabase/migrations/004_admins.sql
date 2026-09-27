-- Comptes admin SMART.ECO — les codes ne sont jamais stockés en clair (SHA-256)

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  code_hash text not null,
  created_at timestamptz not null default now()
);

-- Insertion des 2 admins (hash SHA-256 du code, calculé une fois hors ligne)
insert into admins (nom, prenom, code_hash) values
  ('Ferrary', 'Moïse', 'd4d962cb03d10f0053f1b2061d0ce5ef02bd65d135bd3ae3b4c4264200cc8b86'),
  ('Homilus', 'Snerla', '57ddd541b834184b42d9f1ffd857426ab14d0e7e207f9a1268d3903a1873f632')
on conflict do nothing;

alter table admins enable row level security;
-- Aucun accès direct depuis le client : uniquement via les fonctions Edge (service_role)
revoke all on admins from anon, authenticated;

create table if not exists admin_sessions (
  token text primary key,
  admin_id uuid references admins(id),
  created_at timestamptz not null default now()
);
alter table admin_sessions enable row level security;
revoke all on admin_sessions from anon, authenticated;
