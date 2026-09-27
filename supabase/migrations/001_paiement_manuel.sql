-- Schéma SMART.ECO — paiement manuel + vouchers
-- À exécuter dans Supabase SQL Editor

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  prenom text not null,
  nom text not null,
  telephone text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id text primary key,                 -- 'heure' | 'jour' | 'semaine' | 'mois'
  label text not null,
  prix_unitaire numeric not null,       -- HTG par unité (heure/jour/semaine) ; pour 'mois' = prix fixe
  unite text not null                   -- 'heure' | 'jour' | 'semaine' | 'mois'
);

insert into plans (id, label, prix_unitaire, unite) values
  ('heure', 'Forfait Heures', 15, 'heure'),
  ('jour', 'Forfait Jour', 75, 'jour'),
  ('semaine', 'Forfait Semaine', 350, 'semaine'),
  ('mois', 'Forfait Mois', 1100, 'mois')
on conflict (id) do nothing;

create table if not exists frais_natcash (
  id serial primary key,
  tranche_min numeric not null,
  tranche_max numeric not null,
  frais_retrait numeric not null
);

insert into frais_natcash (tranche_min, tranche_max, frais_retrait) values
  (20, 99, 5.50),
  (100, 249, 11.50),
  (250, 499, 13.50),
  (500, 999, 21.00),
  (1000, 1999, 41.00),
  (2000, 3999, 68.00),
  (4000, 7999, 97.00),
  (8000, 11999, 125.00),
  (12000, 19999, 165.00),
  (20000, 40000, 274.00)
on conflict do nothing;

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,            -- code renvoyé par l'API UniFi
  client_id uuid references clients(id),
  plan_id text references plans(id),
  quantite integer not null default 1,  -- ex: 3 heures, 2 jours...
  minutes_totales integer not null,
  montant_htg numeric not null,
  source text not null,                 -- 'kobara' | 'manuel'
  statut text not null default 'actif', -- 'actif' | 'expire' | 'annule'
  created_at timestamptz not null default now()
);

create table if not exists payment_proofs (
  id uuid primary key default gen_random_uuid(),
  client_telephone text not null,
  plan_id text references plans(id),
  quantite integer not null default 1,
  montant_attendu numeric not null,
  numero_expediteur text not null,
  methode text not null,                -- 'moncash' | 'natcash'
  image_hash text not null,
  image_url text,
  montant_detecte numeric,
  reference_detectee text,
  statut text not null default 'en_attente', -- 'en_attente' | 'valide' | 'refuse'
  motif_refus text,                     -- jamais affiché au client, usage interne
  voucher_id uuid references vouchers(id),
  created_at timestamptz not null default now()
);

-- Empêche de réutiliser deux fois la même image ou référence de transaction
create unique index if not exists idx_payment_proofs_image_hash on payment_proofs(image_hash) where statut = 'valide';
create unique index if not exists idx_payment_proofs_reference on payment_proofs(reference_detectee) where reference_detectee is not null and statut = 'valide';
