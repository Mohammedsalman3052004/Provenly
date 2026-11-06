'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { done, errMsg, fail, logActivity, requireUser, type ActionResult } from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';
import { computeFormulas } from '@/lib/project-data';
import { createDashboardSchema, dashboardInputSchema, uuidSchema } from '@/lib/validators/schemas';
import { instantiateTemplate, sampleProjects } from '@/features/fields/templates';
import type { Field } from '@/types';

export async function createDashboard(input: z.input<typeof createDashboardSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createDashboardSchema.safeParse(input);
    if (!parsed.success) return fail('Please check the dashboard details.');
    const { sb } = await requireUser();
    const v = parsed.data;
    const { count } = await sb.from('dashboards').select('id', { count: 'exact', head: true }).is('deleted_at', null);
    if ((count ?? 0) >= 50) return fail('Dashboard limit reached (50).');
    const { data: dash, error } = await sb.from('dashboards')
      .insert({ name: v.name, description: v.description || null, icon: v.icon, color: v.color, template: v.template, position: count ?? 0 })
      .select('id').single();
    if (error || !dash) return fail(error?.message ?? 'Could not create dashboard');

    const fields = instantiateTemplate(dash.id, v.template, v.currency, v.fieldKeys);
    const { error: fe } = await sb.from('dashboard_fields').insert(fields);
    if (fe) return fail(fe.message);

    if (v.sample) {
      const rows = sampleProjects(fields, v.currency).map((d) => ({
        dashboard_id: dash.id,
        data: computeFormulas(fields.map((f) => ({ ...f, position: f.position })), d),
      }));
      await sb.from('projects').insert(rows);
    }
    await logActivity(sb, { dashboard_id: dash.id, action: 'dashboard.created', summary: `Created dashboard “${v.name}”` });
    revalidatePath('/app', 'layout');
    return done({ id: dash.id });
  } catch (e) {
    return fail(errMsg(e));
  }
}

const updateSchema = dashboardInputSchema.extend({ is_published: z.boolean() });

export async function updateDashboard(id: string, input: z.input<typeof updateSchema>): Promise<ActionResult> {
  try {
    const parsed = updateSchema.safeParse(input);
    if (!uuidSchema.safeParse(id).success || !parsed.success) return fail('Invalid input');
    const { sb } = await requireUser();
    const v = parsed.data;
    const { error } = await sb.from('dashboards')
      .update({ name: v.name, description: v.description || null, icon: v.icon, color: v.color, is_published: v.is_published }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/app', 'layout');
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function deleteDashboard(id: string): Promise<void> {
  const { sb } = await requireUser();
  if (!uuidSchema.safeParse(id).success) return;
  await sb.from('dashboards').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/app', 'layout');
  redirect('/app');
}

export async function duplicateDashboard(id: string, withData: boolean): Promise<ActionResult<{ id: string }>> {
  try {
    if (!uuidSchema.safeParse(id).success) return fail('Invalid dashboard');
    const { sb } = await requireUser();
    const { data: src } = await sb.from('dashboards').select('*').eq('id', id).is('deleted_at', null).single();
    if (!src) return fail('Dashboard not found');
    const { count } = await sb.from('dashboards').select('id', { count: 'exact', head: true }).is('deleted_at', null);
    const { data: copy, error } = await sb.from('dashboards')
      .insert({ name: `${src.name} (copy)`.slice(0, 80), description: src.description, icon: src.icon, color: src.color, template: src.template, position: count ?? 0 })
      .select('id').single();
    if (error || !copy) return fail(error?.message ?? 'Could not duplicate');

    const { data: oldFields } = await sb.from('dashboard_fields').select('*').eq('dashboard_id', id).is('archived_at', null).order('position');
    const olds = (oldFields ?? []) as Field[];
    const map = new Map(olds.map((f) => [f.id, crypto.randomUUID()]));
    const fields = olds.map((f) => ({
      id: map.get(f.id)!, dashboard_id: copy.id, name: f.name, type: f.type, role: f.role, position: f.position,
      required: f.required, sensitive: f.sensitive, default_visible: f.default_visible,
      options: f.options.formula
        ? { ...f.options, formula: { ...f.options.formula, a: map.get(f.options.formula.a) ?? f.options.formula.a, b: map.get(f.options.formula.b) ?? f.options.formula.b } }
        : f.options,
    }));
    if (fields.length) await sb.from('dashboard_fields').insert(fields);

    if (withData) {
      for (let from = 0; ; from += 500) {
        const { data: rows } = await sb.from('projects').select('data').eq('dashboard_id', id).is('deleted_at', null).order('created_at').range(from, from + 499);
        const list = rows ?? [];
        const mapped = list.map((r) => {
          const d: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r.data as Record<string, unknown>)) if (map.has(k)) d[map.get(k)!] = v;
          return { dashboard_id: copy.id, data: d };
        });
        if (mapped.length) await sb.from('projects').insert(mapped);
        if (list.length < 500) break;
      }
    }
    await logActivity(sb, { dashboard_id: copy.id, action: 'dashboard.duplicated', summary: `Duplicated “${src.name}”${withData ? ' with data' : ' (schema only)'}` });
    revalidatePath('/app', 'layout');
    return done({ id: copy.id });
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function signOut(): Promise<void> {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect('/login');
}
