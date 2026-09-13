-- ============================================================================
-- create_admin.sql — create (or repair) a WORKING admin login.
--
-- Why your admin "doesn't work": an admin needs BOTH
--   (1) a confirmed Supabase Auth user (email + password), and
--   (2) a matching row in the `staff` table with role = 'admin'.
-- If either is missing, sign-in fails or the dashboard bounces you back to
-- /login. This script sets up both at once.
--
-- HOW TO USE: change the three values below, paste the whole file into
-- Supabase → SQL Editor, and run it. Then sign in at /login.
-- Change the password again from Supabase → Authentication after first login.
--
-- If sign-in still fails after this (Supabase versions differ), use the
-- Dashboard method instead — see the note at the bottom.
-- ============================================================================

do $$
declare
  v_email    text := 'admin@fayetpartenaires.com';   -- <-- your admin email
  v_password text := 'FayAdmin2026!';                 -- <-- choose a strong password
  v_name     text := 'Administrateur Fay';            -- <-- display name
  v_id       uuid;
begin
  select id into v_id from auth.users where email = v_email;

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      lower(v_email), crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false,
      '', '', '', ''
    );
  else
    update auth.users set
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where id = v_id;
  end if;

  -- An identities row is required by recent Supabase versions. Best-effort:
  -- ignore if the table shape differs on your version.
  begin
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', lower(v_email), 'email_verified', true),
      'email', now(), now(), now()
    )
    on conflict do nothing;
  exception when others then
    -- older schema: identities(id, ...) — try that shape, else skip
    begin
      insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id, v_id, jsonb_build_object('sub', v_id::text, 'email', lower(v_email)), 'email', now(), now(), now())
      on conflict do nothing;
    exception when others then null;
    end;
  end;

  -- Promote to admin in the app.
  insert into staff (id, full_name, role, is_active)
  values (v_id, v_name, 'admin', true)
  on conflict (id) do update
    set role = 'admin', is_active = true, full_name = excluded.full_name;

  raise notice 'Admin ready: % (role=admin). Sign in at /login.', v_email;
end $$;

-- ── Dashboard alternative (most reliable) ───────────────────────────────────
-- 1. Supabase → Authentication → Users → "Add user":
--      email + password, and TICK "Auto Confirm User".
-- 2. Then run ONLY this to grant admin access (use the same email):
--
--    insert into staff (id, full_name, role, is_active)
--    select id, 'Administrateur Fay', 'admin', true
--    from auth.users where email = 'admin@fayetpartenaires.com'
--    on conflict (id) do update set role='admin', is_active=true;
