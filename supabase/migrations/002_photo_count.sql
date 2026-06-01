-- Allow guests to see how many photos have been captured even before reveal,
-- without exposing the rows themselves.

create or replace function public.photo_count()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.photos;
$$;

create or replace function public.my_photo_count()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
  from public.photos
  where guest_id = auth.uid();
$$;

grant execute on function public.photo_count()    to authenticated;
grant execute on function public.my_photo_count() to authenticated;
