-- Minimal MVP: enable 999 2FA flow without touching existing authenticate_user()
-- - Creates two_factor_codes if missing
-- - Provides generate_2fa_code() that inserts a 6-digit code with 90s TTL
-- - Provides validate_2fa_code() used by existing auth flows (no changes to auth function)

-- 1) two_factor_codes table (idempotent)
create table if not exists public.two_factor_codes (
  id bigserial primary key,
  account_number bigint not null,
  code text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used boolean not null default false,
  ip_address text,
  user_agent text
);

-- Helpful indexes
create index if not exists idx_2fa_codes_lookup
  on public.two_factor_codes (account_number, code)
  where used = false;

create index if not exists idx_2fa_codes_expires_at
  on public.two_factor_codes (expires_at);

-- 2) Code generator, 6 digits, 90s TTL. Does NOT send SMS; Edge function handles delivery.
create or replace function public.generate_2fa_code(
  p_account_number bigint,
  p_ip_address text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_expires_at timestamptz;
begin
  -- 6-digit string with leading zeros preserved
  v_code := lpad((trunc(random() * 1000000))::int::text, 6, '0');
  v_expires_at := now() + interval '90 seconds';

  insert into public.two_factor_codes(account_number, code, expires_at, ip_address, user_agent)
  values (p_account_number, v_code, v_expires_at, p_ip_address, p_user_agent);

  -- Do not return the code; client will receive it via SMS
  return jsonb_build_object('created', true, 'expires_at', v_expires_at);
end;
$$;

revoke all on function public.generate_2fa_code(bigint, text, text) from public;
grant execute on function public.generate_2fa_code(bigint, text, text) to anon, authenticated;

-- 3) Simple validator that marks code used if valid and not expired
create or replace function public.validate_2fa_code(
  p_account_number bigint,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  update public.two_factor_codes
     set used = true
   where account_number = p_account_number
     and code = p_code
     and used = false
     and expires_at > now()
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.validate_2fa_code(bigint, text) from public;
grant execute on function public.validate_2fa_code(bigint, text) to anon, authenticated;
