-- El Más Guay del Mundo · esquema inicial
-- Pega este archivo entero en Supabase → SQL Editor → Run (una sola vez).
-- Toda la lectura y escritura pasa por el servidor (clave service_role). El público no tiene acceso directo.

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- Cada persona del ranking. El orden del ranking es crowned_at (la última vez que subió al nº 1), de más nuevo a más viejo.
create table public.players (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 30),
  name_key       text not null unique,            -- nombre en minúsculas y sin tildes: no puede haber dos iguales
  link           text check (link is null or char_length(link) <= 300),
  photo_url      text,
  emoji          text check (emoji is null or char_length(emoji) <= 16),
  hue            int not null default 250 check (hue between 0 and 359),
  times          int not null default 1,          -- veces que ha sido el nº 1
  crowned_at     timestamptz not null default now(),
  last_reign_ms  bigint not null default 0,       -- lo que duró su último reinado
  best_reign_ms  bigint not null default 0,       -- su reinado más largo
  credits        int not null default 0 check (credits >= 0),  -- coronaciones guardadas del Pack pique
  token_hash     text not null,                   -- huella de la clave que guarda su navegador
  email          text,                            -- el que puso en Stripe (privado)
  created_at     timestamptz not null default now()
);
create index players_rank_idx on public.players (crowned_at desc, id desc);
create index players_name_trgm_idx on public.players using gin (name_key extensions.gin_trgm_ops);
create index players_best_reign_idx on public.players (best_reign_ms desc);
create index players_times_idx on public.players (times desc);

-- Cada coronación: quién subió y a quién le quitó el trono.
create table public.crowns (
  id              bigint generated always as identity primary key,
  player_id       uuid not null references public.players (id) on delete cascade,
  loser_id        uuid references public.players (id) on delete set null,
  loser_reign_ms  bigint,
  order_id        uuid unique,
  at              timestamptz not null default now()
);
create index crowns_at_idx on public.crowns (at desc);
create index crowns_loser_reign_idx on public.crowns (loser_reign_ms) where loser_id is not null;

-- Cada intento de coronarse: ya ha pasado el filtro y espera el pago (o usa una coronación guardada).
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid references public.players (id) on delete cascade,  -- null = persona nueva
  name            text not null,
  name_key        text not null,
  link            text,
  emoji           text,
  hue             int not null default 250,
  photo           text,                          -- foto ya revisada (JPEG en base64) hasta publicarla
  keep_photo      boolean not null default false, -- conservar la foto que ya tiene
  token_hash      text not null,
  plan            text check (plan in ('one', 'pack')),
  amount_cents    int check (amount_cents >= 0),
  provider        text check (provider in ('stripe', 'credit')),
  provider_ref    text,
  email           text,
  status          text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  crowned_player  uuid,
  created_at      timestamptz not null default now()
);
create index orders_provider_ref_idx on public.orders (provider_ref);

-- Límite de intentos por IP (anonimizada).
create table public.rate_hits (
  key  text not null,
  at   timestamptz not null default now()
);
create index rate_hits_key_at_idx on public.rate_hits (key, at);
create index rate_hits_at_idx on public.rate_hits (at);

-- Solo el servidor (service_role) usa las tablas. Con la clave pública no se ve nada:
-- no hay políticas, así que RLS lo bloquea todo aunque el proyecto exponga las tablas.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

alter table public.players   enable row level security;
alter table public.crowns    enable row level security;
alter table public.orders    enable row level security;
alter table public.rate_hits enable row level security;

/* ------------------------------------------------------------------ */
/* Lo que se enseña de cada persona (nunca el email ni la clave)       */
/* ------------------------------------------------------------------ */

create or replace function public.player_card(p public.players)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('id', p.id, 'name', p.name, 'photo', p.photo_url, 'emoji', p.emoji, 'hue', p.hue, 'times', p.times);
$$;

create or replace function public.player_row(p public.players)
returns jsonb
language sql
immutable
as $$
  select public.player_card(p) || jsonb_build_object('link', p.link, 'crownedAt', p.crowned_at, 'lastReignMs', p.last_reign_ms);
$$;

/* ------------------------------------------------------------------ */
/* Coronar                                                             */
/* ------------------------------------------------------------------ */

-- Corona un pedido pagado de forma atómica e idempotente (los avisos de pago pueden llegar dos veces).
-- p_plan: 'one' o 'pack' (el que se pagó de verdad, según Stripe).
create or replace function public.crown_order(p_order uuid, p_plan text, p_photo_url text, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  o           orders%rowtype;
  k           players%rowtype;
  pid         uuid;
  now_ts      timestamptz;
  reign       bigint;
  extra       int;
  used        int;
  final_name  text;
  final_key   text;
  i           int;
begin
  select * into o from orders where id = p_order for update;
  if not found then
    raise exception 'order % not found', p_order;
  end if;
  if o.status = 'paid' then
    return o.crowned_player;
  end if;

  -- Una coronación cada vez: el orden del ranking no tiene empates raros.
  perform pg_advisory_xact_lock(4242);
  now_ts := clock_timestamp();

  select * into k from players order by crowned_at desc, id desc limit 1;

  pid := o.player_id;
  if pid is not null and not exists (select 1 from players where id = pid) then
    pid := null; -- el perfil se borró mientras pagaba: se crea de nuevo
  end if;

  extra := case when coalesce(p_plan, o.plan) = 'pack' then 4 else 0 end;
  used := case when o.provider = 'credit' then 1 else 0 end;

  if used = 1 and (pid is null or k.id = pid) then
    raise exception 'credit_not_usable';
  end if;

  -- Si alguien se ha quedado el nombre mientras esta persona pagaba, se le añade un número.
  final_name := o.name;
  final_key := o.name_key;
  if exists (select 1 from players where name_key = final_key and id is distinct from pid) then
    for i in 2..9999 loop
      if not exists (select 1 from players where name_key = o.name_key || '#' || i) then
        final_name := left(o.name, 30 - char_length(' ' || i)) || ' ' || i;
        final_key := o.name_key || '#' || i;
        exit;
      end if;
    end loop;
  end if;

  if k.id is not null and k.id = pid then
    -- Ya era el nº 1: suma la coronación sin reiniciar su reinado.
    update players
       set name = final_name, name_key = final_key, link = o.link,
           photo_url = case when o.keep_photo then photo_url else p_photo_url end,
           emoji = o.emoji, hue = o.hue,
           times = times + 1, credits = credits + extra,
           email = coalesce(p_email, email)
     where id = pid;
  else
    if k.id is not null then
      reign := floor(extract(epoch from (now_ts - k.crowned_at)) * 1000);
      update players
         set last_reign_ms = reign, best_reign_ms = greatest(best_reign_ms, reign)
       where id = k.id;
    end if;

    if pid is null then
      insert into players (name, name_key, link, photo_url, emoji, hue, times, crowned_at, credits, token_hash, email)
      values (final_name, final_key, o.link, p_photo_url, o.emoji, o.hue, 1, now_ts, extra, o.token_hash, p_email)
      returning id into pid;
    else
      update players
         set name = final_name, name_key = final_key, link = o.link,
             photo_url = case when o.keep_photo then photo_url else p_photo_url end,
             emoji = o.emoji, hue = o.hue,
             times = times + 1, crowned_at = now_ts,
             credits = credits + extra - used,
             email = coalesce(p_email, email)
       where id = pid;
    end if;

    insert into crowns (player_id, loser_id, loser_reign_ms, order_id, at)
    values (pid, k.id, reign, o.id, now_ts);
  end if;

  update orders
     set status = 'paid', plan = coalesce(p_plan, plan), crowned_player = pid, photo = null, email = coalesce(p_email, email)
   where id = o.id;

  return pid;
end;
$$;

-- Anula un pedido que no se va a pagar.
create or replace function public.cancel_order(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update orders set status = 'cancelled', photo = null where id = p_id and status = 'pending';
$$;

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

-- Todo lo que pinta la portada: el nº 1, una página de 100 puestos y la columna de la derecha.
create or replace function public.live_snapshot(p_page int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  per        constant int := 100;
  total      bigint;
  last_page  int;
  pg         int;
  king       players%rowtype;
  last_crown crowns%rowtype;
  king_prev  jsonb;
  rows_json  jsonb;
  feed       jsonb;
  record     jsonb;
  most       jsonb;
  shortest   jsonb;
  pique      jsonb;
  pa         uuid;
  pb         uuid;
  today      bigint;
  midnight   timestamptz := date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
begin
  select count(*) into total from players;
  last_page := greatest(1, ceil(total::numeric / per)::int);
  pg := least(greatest(coalesce(p_page, 1), 1), last_page);

  select * into king from players order by crowned_at desc, id desc limit 1;
  select * into last_crown from crowns order by id desc limit 1;

  if king.id is not null and last_crown.player_id = king.id and last_crown.loser_id is not null then
    select jsonb_build_object('name', l.name, 'ms', last_crown.loser_reign_ms) into king_prev
      from players l where l.id = last_crown.loser_id;
  end if;

  select coalesce(jsonb_agg(public.player_row(s.p) || jsonb_build_object('pos', s.pos) order by s.pos), '[]'::jsonb)
    into rows_json
    from (
      select t.p, ((pg - 1) * per + row_number() over (order by (t.p).crowned_at desc, (t.p).id desc))::int as pos
        from (select x as p from players x order by x.crowned_at desc, x.id desc offset (pg - 1) * per limit per) t
    ) s;

  select coalesce(jsonb_agg(f.item order by f.id desc), '[]'::jsonb)
    into feed
    from (
      select c.id,
             jsonb_build_object(
               'id', c.id, 'at', c.at, 'ms', c.loser_reign_ms,
               'w', public.player_card(w),
               'l', case when l.id is null then null else public.player_card(l) end
             ) as item
        from crowns c
        join players w on w.id = c.player_id
        left join players l on l.id = c.loser_id
       order by c.id desc
       limit 6
    ) f;

  select public.player_card(p) || jsonb_build_object('ms', p.best_reign_ms) into record
    from players p where p.best_reign_ms > 0 order by p.best_reign_ms desc limit 1;

  select public.player_card(p) into most
    from players p where p.times > 1 order by p.times desc, p.crowned_at desc limit 1;

  select public.player_card(l) || jsonb_build_object('ms', c.loser_reign_ms) into shortest
    from crowns c join players l on l.id = c.loser_id
   where c.loser_id is not null and c.loser_reign_ms is not null
   order by c.loser_reign_ms asc, c.id desc limit 1;

  -- Pique del momento: la pareja que más veces se ha quitado el trono en las últimas 500 coronaciones.
  select q.a, q.b into pa, pb
    from (
      select least(r.player_id, r.loser_id) as a, greatest(r.player_id, r.loser_id) as b, count(*) as n, max(r.id) as last_id
        from (select id, player_id, loser_id from crowns where loser_id is not null order by id desc limit 500) r
       where r.player_id <> r.loser_id
       group by 1, 2
    ) q
   where q.n >= 2
   order by q.n desc, q.last_id desc
   limit 1;
  if pa is null then
    -- Si no hay pareja, las dos personas que más veces han sido el nº 1.
    select (array_agg(t.id order by t.times desc, t.crowned_at desc))[1], (array_agg(t.id order by t.times desc, t.crowned_at desc))[2]
      into pa, pb
      from (select id, times, crowned_at from players where times >= 2 order by times desc, crowned_at desc limit 2) t;
  end if;
  if pa is not null and pb is not null then
    select jsonb_build_object('a', public.player_card(a), 'b', public.player_card(b)) into pique
      from players a, players b
     where a.id = pa and b.id = pb;
    -- El de más coronaciones, a la izquierda.
    if (pique -> 'a' ->> 'times')::int < (pique -> 'b' ->> 'times')::int then
      pique := jsonb_build_object('a', pique -> 'b', 'b', pique -> 'a');
    end if;
  end if;

  select count(*) into today from crowns where at >= midnight;

  return jsonb_build_object(
    'now', clock_timestamp(),
    'version', coalesce(last_crown.id, 0),
    'total', total,
    'today', today,
    'page', pg,
    'lastPage', last_page,
    'king', case when king.id is null then null else public.player_row(king) end,
    'kingPrev', king_prev,
    'rows', rows_json,
    'feed', feed,
    'fame', jsonb_build_object('record', record, 'most', most, 'shortest', shortest),
    'pique', pique
  );
end;
$$;

-- Puesto de una persona (para "Tu puesto").
create or replace function public.player_position(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.player_row(p) || jsonb_build_object(
           'pos', (select count(*) from players x where (x.crowned_at, x.id) > (p.crowned_at, p.id)) + 1,
           'total', (select count(*) from players),
           'credits', p.credits)
    from players p
   where p.id = p_id;
$$;

-- Buscador: hasta 8 personas cuyo nombre contiene el texto (ya en minúsculas, sin tildes y con % y _ escapados).
create or replace function public.search_players(p_q text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public.player_card(s.p) || jsonb_build_object('pos', s.pos) order by s.pos), '[]'::jsonb)
    from (
      select p, (select count(*) from players x where (x.crowned_at, x.id) > (p.crowned_at, p.id)) + 1 as pos
        from players p
       where p.name_key like '%' || p_q || '%' escape '\'
       order by p.crowned_at desc, p.id desc
       limit 8
    ) s;
$$;

-- Devuelve true si la clave aún no ha superado p_max intentos en la ventana.
create or replace function public.rate_check(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c int;
begin
  -- Las huellas de IP no se guardan más de un día.
  delete from rate_hits where at < now() - interval '1 day';
  select count(*) into c from rate_hits
   where key = p_key and at > now() - make_interval(secs => p_window_seconds);
  if c >= p_max then
    return false;
  end if;
  insert into rate_hits (key) values (p_key);
  return true;
end;
$$;

-- Solo el servidor (service_role) puede ejecutar estas funciones.
revoke execute on function public.player_card(public.players)    from public, anon, authenticated;
revoke execute on function public.player_row(public.players)     from public, anon, authenticated;
revoke execute on function public.crown_order(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.cancel_order(uuid)             from public, anon, authenticated;
revoke execute on function public.live_snapshot(int)             from public, anon, authenticated;
revoke execute on function public.player_position(uuid)          from public, anon, authenticated;
revoke execute on function public.search_players(text)           from public, anon, authenticated;
revoke execute on function public.rate_check(text, int, int)     from public, anon, authenticated;
grant execute on function public.player_card(public.players)     to service_role;
grant execute on function public.player_row(public.players)      to service_role;
grant execute on function public.crown_order(uuid, text, text, text) to service_role;
grant execute on function public.cancel_order(uuid)              to service_role;
grant execute on function public.live_snapshot(int)              to service_role;
grant execute on function public.player_position(uuid)           to service_role;
grant execute on function public.search_players(text)            to service_role;
grant execute on function public.rate_check(text, int, int)      to service_role;

-- Carpeta pública "fotos" en Supabase Storage (solo existe en Supabase; en una base de datos local se salta).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('fotos', 'fotos', true, 300000, array['image/jpeg'])
    on conflict (id) do nothing;
  end if;
end;
$$;
