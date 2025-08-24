-- Migration: Create admin_logins (capture IP, UA, time, 6-digit code, 90s expiry) and sms_admins
-- Also add RPCs: generate_admin_login_code, validate_admin_login_code, and wrapper generate_2fa_code
-- Notes:
-- - AuthContext currently calls generate_2fa_code(p_account_number, p_ip_address). This wrapper preserves that API and adds p_user_agent optionally.
-- - Edge function will be updated to prioritize admin_logins for code lookup and sms_admins for phone recipients.

-- 1) Create sms_admins: authoritative list of admin phones to notify
create table if not exists public.sms_admins (
  phone_number text primary key,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- 2) Create admin_logins to store 2FA codes and metadata for admin login attempts
create table if not exists public.admin_logins (
  id bigserial primary key,
  account_number bigint not null,
  ip_address text,
  user_agent text,
  code text not null check (code ~ '^\d{6}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used boolean not null default false,
  used_at timestamptz
);

-- Helpful indexes
create index if not exists idx_admin_logins_acct_active on public.admin_logins (account_number, used, expires_at desc);
create index if not exists idx_admin_logins_created_at on public.admin_logins (created_at desc);

-- 2a) Seed sms_admins from existing configurations (if present)
do $$
begin
  -- Seed from sms_notification_settings (event_name='2FA_LOGIN', is_enabled=true)
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'sms_notification_settings'
  ) then
    insert into public.sms_admins (phone_number)
    select distinct p
    from (
      select unnest(notification_phones) as p
      from public.sms_notification_settings
      where event_name = '2FA_LOGIN' and is_enabled = true
    ) s
    where p is not null and length(trim(p)) > 0
    on conflict (phone_number) do nothing;
  end if;

  -- Seed from legacy public."2fa" table (phonenumber column)
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = '2fa'
  ) then
    insert into public.sms_admins (phone_number)
    select distinct phonenumber
    from public."2fa"
    where phonenumber is not null and length(trim(phonenumber)) > 0
    on conflict (phone_number) do nothing;
  end if;
exception when others then
  -- Ignore any errors during seeding to avoid migration failure
  null;
end $$;

-- 3) Function: generate_admin_login_code - generate 6-digit code with 90s expiry and capture IP/UA
create or replace function public.generate_admin_login_code(
  p_account_number bigint,
  p_ip_address text default null,
  p_user_agent text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_expires_at timestamptz := now() + interval '90 seconds';
  v_id bigint;
  v_created_at timestamptz;
begin
  -- Generate a 6-digit code (allow leading zeros)
  v_code := lpad((trunc(random() * 1000000)::int)::text, 6, '0');
  if v_code !~ '^\d{6}$' then
    v_code := '000000';
  end if;

  insert into public.admin_logins (account_number, ip_address, user_agent, code, expires_at)
  values (p_account_number, p_ip_address, p_user_agent, v_code, v_expires_at)
  returning id, created_at into v_id, v_created_at;

  -- Optional backward-compatibility: mirror to two_factor_codes if it exists
  begin
    perform 1
      from information_schema.tables
     where table_schema = 'public'
       and table_name = 'two_factor_codes';
    if found then
      begin
        execute $I$
          insert into public.two_factor_codes (account_number, code, created_at, expires_at, used)
          values ($1, $2, $3, $4, false)
        $I$ using p_account_number, v_code, v_created_at, v_expires_at;
      exception when others then
        -- ignore to not break primary flow
        null;
      end;
    end if;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'id', v_id,
    'code', v_code,
    'created_at', v_created_at,
    'expires_at', v_expires_at
  );
end;
$$;

-- 4) Backward-compatible wrapper: generate_2fa_code (preserves existing frontend RPC name)
create or replace function public.generate_2fa_code(
  p_account_number bigint,
  p_ip_address text default null,
  p_user_agent text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.generate_admin_login_code(p_account_number, p_ip_address, p_user_agent);
end;
$$;

-- 5) Function: validate_admin_login_code - accept any matching unexpired, unused code; mark only that row used
create or replace function public.validate_admin_login_code(
  p_account_number bigint,
  p_code text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  select id
    into v_id
    from public.admin_logins
   where account_number = p_account_number
     and code = p_code
     and used = false
     and expires_at > now()
   order by created_at desc
   limit 1;

  if v_id is null then
    return false;
  end if;

  update public.admin_logins
     set used = true,
         used_at = now()
   where id = v_id;

  -- Optional mirror to two_factor_codes if present
  begin
    perform 1
      from information_schema.tables
     where table_schema = 'public'
       and table_name = 'two_factor_codes';
    if found then
      begin
        execute $I$
          update public.two_factor_codes
             set used = true
           where account_number = $1
             and code = $2
             and used = false
        $I$ using p_account_number, p_code;
      exception when others then
        null;
      end;
    end if;
  exception when others then
    null;
  end;

  return true;
end;
$$;

-- 6) RPC permissions
grant execute on function public.generate_admin_login_code(bigint, text, text) to anon, authenticated;
grant execute on function public.generate_2fa_code(bigint, text, text) to anon, authenticated;
grant execute on function public.validate_admin_login_code(bigint, text) to anon, authenticated;
