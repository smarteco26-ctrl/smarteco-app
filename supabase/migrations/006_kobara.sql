-- Suivi des paiements Kobara (créés côté serveur, confirmés par webhook)

create table if not exists kobara_payments (
  id uuid primary key default gen_random_uuid(),
  client_ref text unique not null,           -- généré par nous, connu avant l'appel à Kobara
  kobara_payment_id text unique,             -- rempli après la réponse de l'API Kobara
  telephone text not null,
  prenom text not null,
  nom text not null,
  plan_id text not null,
  quantite integer not null default 1,
  montant_htg numeric not null,
  statut text not null default 'en_attente', -- 'en_attente' | 'valide' | 'echoue'
  voucher_id uuid references vouchers(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_kobara_payments_ref on kobara_payments(client_ref);
create index if not exists idx_kobara_payments_kobara_id on kobara_payments(kobara_payment_id);

alter table kobara_payments enable row level security;
-- Aucun accès direct : uniquement via les fonctions Edge (service_role)
revoke all on kobara_payments from anon, authenticated;
