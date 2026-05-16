-- RPCs de ciclo de vida alineadas con el esquema actual (bookings: pending|confirmed|cancelled; rides: scheduled|in_progress|completed|cancelled).
-- Sin columnas de auditoria en bookings. Opcional: publicar rides/bookings en Realtime.

create or replace function public.start_ride(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id   uuid;
  v_ride      public.rides%rowtype;
  v_is_driver boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select * into v_ride from public.rides where ride_id = p_ride_id for update;
  if not found then
    raise exception 'El viaje no existe';
  end if;

  v_is_driver := exists (
    select 1 from public.driver_profiles dp
    where dp.driver_id = v_ride.driver_id and dp.user_id = v_user_id
  );
  if not v_is_driver then
    raise exception 'Solo el conductor puede iniciar el viaje';
  end if;
  if v_ride.status <> 'scheduled' then
    raise exception 'El viaje no esta programado';
  end if;

  update public.bookings
     set status = 'cancelled'
   where ride_id = p_ride_id and status = 'pending';

  update public.rides set status = 'in_progress' where ride_id = p_ride_id;
end;
$$;

create or replace function public.complete_ride(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id   uuid;
  v_ride      public.rides%rowtype;
  v_is_driver boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select * into v_ride from public.rides where ride_id = p_ride_id for update;
  if not found then
    raise exception 'El viaje no existe';
  end if;

  v_is_driver := exists (
    select 1 from public.driver_profiles dp
    where dp.driver_id = v_ride.driver_id and dp.user_id = v_user_id
  );
  if not v_is_driver then
    raise exception 'Solo el conductor puede finalizar el viaje';
  end if;
  if v_ride.status <> 'in_progress' then
    raise exception 'El viaje no esta en curso';
  end if;

  update public.rides set status = 'completed' where ride_id = p_ride_id;
end;
$$;

create or replace function public.cancel_ride(p_ride_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id   uuid;
  v_ride      public.rides%rowtype;
  v_is_driver boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  select * into v_ride from public.rides where ride_id = p_ride_id for update;
  if not found then
    raise exception 'El viaje no existe';
  end if;

  v_is_driver := exists (
    select 1 from public.driver_profiles dp
    where dp.driver_id = v_ride.driver_id and dp.user_id = v_user_id
  );
  if not v_is_driver then
    raise exception 'Solo el conductor puede cancelar el viaje';
  end if;
  if v_ride.status not in ('scheduled','in_progress') then
    raise exception 'El viaje ya esta finalizado';
  end if;

  update public.rides r
     set available_seats = r.available_seats + coalesce((
           select sum(b.seats_reserved)
           from public.bookings b
           where b.ride_id = p_ride_id and b.status = 'confirmed'
         ), 0),
         status = 'cancelled'
   where r.ride_id = p_ride_id;

  update public.bookings
     set status = 'cancelled'
   where ride_id = p_ride_id
     and status in ('pending','confirmed');
end;
$$;

revoke execute on function public.start_ride(uuid) from anon, public;
revoke execute on function public.complete_ride(uuid) from anon, public;
revoke execute on function public.cancel_ride(uuid, text) from anon, public;

grant execute on function public.start_ride(uuid) to authenticated;
grant execute on function public.complete_ride(uuid) to authenticated;
grant execute on function public.cancel_ride(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rides'
  ) then
    execute 'alter publication supabase_realtime add table public.rides';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    execute 'alter publication supabase_realtime add table public.bookings';
  end if;
end $$;
