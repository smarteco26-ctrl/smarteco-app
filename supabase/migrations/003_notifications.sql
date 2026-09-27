-- Notifications in-app SMART.ECO

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  telephone text not null,
  titre text not null,
  corps text not null,
  categorie text not null default 'info', -- 'alert' | 'smartia' | 'info' | 'promo'
  lue boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_telephone on notifications(telephone);

alter table notifications enable row level security;

create policy if not exists "Lecture publique notifications" on notifications
  for select using (true);

create policy if not exists "Marquer comme lue" on notifications
  for update using (true) with check (true);

revoke insert, delete on notifications from anon, authenticated;
