-- OPTIONAL demo data. Run in the Supabase SQL editor AFTER you have signed up once.
-- It creates a "Demo Freelancing" dashboard with 6 projects for the most recently created user.
do $$
declare
  u uuid; d uuid; f_name uuid; f_url uuid; f_amt uuid; f_start uuid; f_end uuid; f_spent uuid; f_profit uuid; f_client uuid; f_status uuid; f_tags uuid;
  i int; amt bigint; sp bigint;
  names text[] := array['Aurora Interiors','Northwind Realty','Kite & Co. Store','Lumen Studio','Greenleaf Clinic','Orbit CRM'];
  clients text[] := array['Aurora Group','Northwind','Kite & Co.','Lumen','Greenleaf','Orbit Labs'];
begin
  select id into u from auth.users order by created_at desc limit 1;
  if u is null then raise exception 'Sign up in the app first, then run this seed.'; end if;
  insert into public.dashboards (owner_id, name, description, template) values (u, 'Demo Freelancing', 'Sample data', 'freelancing') returning id into d;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, required) values (d, 'Project Name', 'text', 'title', 0, true) returning id into f_name;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position) values (d, 'Project URL', 'url', 'url', 1) returning id into f_url;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, sensitive, options) values (d, 'Project Amount', 'currency', 'amount', 2, true, '{"currency":"INR"}') returning id into f_amt;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position) values (d, 'Start Date', 'date', 'start', 3) returning id into f_start;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position) values (d, 'End Date', 'date', 'end', 4) returning id into f_end;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, sensitive, options) values (d, 'Money Spent', 'currency', 'spent', 5, true, '{"currency":"INR"}') returning id into f_spent;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, sensitive, options)
    values (d, 'Profit', 'formula', 'profit', 6, true, jsonb_build_object('currency','INR','formula',jsonb_build_object('op','subtract','a',f_amt,'b',f_spent))) returning id into f_profit;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, sensitive) values (d, 'Client / Source', 'person', 'client', 7, true) returning id into f_client;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position, options)
    values (d, 'Status', 'status', 'status', 8, '{"choices":[{"value":"In progress","color":"#c8a25a"},{"value":"Completed","color":"#7fa66b","done":true}]}') returning id into f_status;
  insert into public.dashboard_fields (dashboard_id, name, type, role, position) values (d, 'Tags', 'multiselect', 'tags', 9) returning id into f_tags;
  for i in 1..6 loop
    amt := (20000 + i * 7500) * 100; sp := amt * (10 + i * 3) / 100;
    insert into public.projects (dashboard_id, owner_id, data) values (d, u, jsonb_build_object(
      f_name::text, names[i], f_url::text, 'https://example.com/' || i, f_amt::text, amt, f_spent::text, sp, f_profit::text, amt - sp,
      f_start::text, to_char(current_date - (190 - i * 28), 'YYYY-MM-DD'), f_end::text, to_char(current_date - (170 - i * 28), 'YYYY-MM-DD'),
      f_client::text, clients[i], f_status::text, case when i = 6 then 'In progress' else 'Completed' end,
      f_tags::text, case when i % 2 = 0 then '["Next.js","Supabase"]'::jsonb else '["Webflow"]'::jsonb end));
  end loop;
end $$;
