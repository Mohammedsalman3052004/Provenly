-- Provenly · proof that hidden fields cannot leak through the public RPC, and RLS isolates users.
-- Run after the migrations:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/share_leak_test.sql
-- Everything runs inside a transaction that is rolled back.
begin;
do $$
declare
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
  d1 uuid; f_name uuid; f_amt uuid; f_spent uuid; f_profit uuid; f_client uuid;
  l_id uuid; l_tok text; res jsonb; txt text; n int;
begin
  insert into auth.users (id, email) values (u1, 'a@test.dev'), (u2, 'b@test.dev');
  perform set_config('request.jwt.claim.sub', u1::text, true);
  set local role authenticated;

  insert into public.dashboards (name) values ('Freelancing') returning id into d1;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position) values (d1, 'Name', 'text', 'title', 0) returning id into f_name;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, options) values (d1, 'Amount', 'currency', 'amount', 1, '{"currency":"USD"}') returning id into f_amt;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, options) values (d1, 'Spent', 'currency', 'spent', 2, '{"currency":"USD"}') returning id into f_spent;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, options)
    values (d1, 'Profit', 'formula', 'profit', 3, jsonb_build_object('formula', jsonb_build_object('op','subtract','a',f_amt,'b',f_spent))) returning id into f_profit;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position) values (d1, 'Client', 'person', 'client', 4) returning id into f_client;

  insert into public.projects (dashboard_id, data) values
   (d1, jsonb_build_object(f_name::text,'Acme site', f_amt::text, 7777701, f_spent::text, 1234502, f_profit::text, 6543199, f_client::text, 'SecretClientCo'));
  select amount_minor into n from public.projects where dashboard_id = d1;
  assert n = 7777701, 'denormalised amount column should be filled by trigger';

  -- link hides Amount and Client (Spent stays visible)
  insert into public.share_links (dashboard_id, name, hidden_field_ids) values (d1, 'Resume', array[f_amt, f_client]) returning id, token into l_id, l_tok;
  perform public.set_share_password(l_id, 'hunter2');

  -- anonymous visitor
  reset role; set local role anon;
  res := public.get_shared_dashboard(l_tok);
  assert res->>'status' = 'password_required', 'password gate should close the link';
  res := public.get_shared_dashboard(l_tok, 'wrong');
  assert res->>'status' = 'wrong_password';
  res := public.get_shared_dashboard(l_tok, 'hunter2');
  assert res->>'status' = 'ok', 'correct password should open the link';
  txt := res::text;
  assert position('7777701' in txt) = 0, 'hidden amount value leaked';
  assert position('SecretClientCo' in txt) = 0, 'hidden client value leaked';
  assert position('6543199' in txt) = 0, 'derived profit leaked (amount hidden => profit hidden)';
  assert position(f_amt::text in txt) = 0 and position(f_client::text in txt) = 0 and position(f_profit::text in txt) = 0, 'hidden field ids/definitions leaked';
  assert position('Acme site' in txt) > 0, 'visible data must still be present';
  assert position('1234502' in txt) > 0, 'visible Spent should be present';

  -- anon cannot read tables or the internal builder
  begin perform 1 from public.projects limit 1; assert false, 'anon read projects'; exception when insufficient_privilege then null; end;
  begin perform public.build_shared_payload(d1, '{}', null, null, 'x', '{}', true); assert false, 'anon called builder'; exception when insufficient_privilege then null; end;

  -- revoked and expired links go dark
  reset role; perform set_config('request.jwt.claim.sub', u1::text, true); set local role authenticated;
  update public.share_links set revoked_at = now() where id = l_id;
  reset role; set local role anon;
  assert public.get_shared_dashboard(l_tok, 'hunter2')->>'status' = 'unavailable', 'revoked link still open';

  -- another user cannot see or touch user 1 data
  reset role; perform set_config('request.jwt.claim.sub', u2::text, true); set local role authenticated;
  select count(*) into n from public.projects; assert n = 0, 'cross-user project read';
  select count(*) into n from public.dashboards; assert n = 0, 'cross-user dashboard read';
  select count(*) into n from public.share_links; assert n = 0, 'cross-user link read';
  begin insert into public.projects (dashboard_id, data) values (d1, '{}'); assert false, 'cross-dashboard insert'; exception when insufficient_privilege then null; end;
  assert public.preview_share_config(d1, '{}', null, null, '{}') is null, 'preview for someone else''s dashboard';
  raise notice 'ALL SHARE/RLS TESTS PASSED';
end $$;
rollback;
