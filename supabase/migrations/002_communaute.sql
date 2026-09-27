-- Communauté SMART.ECO — posts et réponses (y compris réponses SmartIA)

create table if not exists communaute_posts (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references communaute_posts(id) on delete cascade,
  telephone text,                 -- null si c'est une réponse de SmartIA
  prenom text not null,
  texte text not null,
  est_ia boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_communaute_posts_parent on communaute_posts(parent_id);
create index if not exists idx_communaute_posts_created on communaute_posts(created_at);

alter table communaute_posts enable row level security;

-- Lecture publique (le flux est visible par tous les clients)
create policy if not exists "Lecture publique communaute" on communaute_posts
  for select using (true);

-- Écriture uniquement via la fonction Edge (clé service_role), pas directement depuis l'app
revoke insert, update, delete on communaute_posts from anon, authenticated;
