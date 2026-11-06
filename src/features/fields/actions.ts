'use server';
import { revalidatePath } from 'next/cache';
import { done, errMsg, fail, logActivity, requireUser, type ActionResult } from '@/lib/actions';
import { fieldsSaveSchema, uuidSchema } from '@/lib/validators/schemas';
import type { FieldOptions } from '@/types';

/** Saves the whole schema. Removed fields are ARCHIVED (values stay in projects.data), never deleted. */
export async function saveFields(dashboardId: string, input: unknown): Promise<ActionResult> {
  try {
    if (!uuidSchema.safeParse(dashboardId).success) return fail('Invalid dashboard');
    const parsed = fieldsSaveSchema.safeParse(input);
    if (!parsed.success) return fail('Please check every field (names are required, formulas need two inputs).');
    const { sb } = await requireUser();
    const list = parsed.data;
    const ids = new Set(list.map((f) => f.id));
    for (const f of list) {
      if (f.type === 'formula') {
        const fm = f.options.formula;
        if (!fm || !ids.has(fm.a) || !ids.has(fm.b) || fm.a === f.id || fm.b === f.id) return fail(`“${f.name}” needs two other fields to calculate from.`);
      }
      if ((f.type === 'currency' || f.type === 'formula') && !f.options.currency) f.options.currency = 'USD';
    }

    const { data: existing } = await sb.from('dashboard_fields').select('id').eq('dashboard_id', dashboardId);
    const existingIds = new Set((existing ?? []).map((r) => r.id as string));
    const now = new Date().toISOString();

    const writes = list.map((f, i) => {
      const row = {
        name: f.name, type: f.type, role: f.role, position: i, required: f.required, sensitive: f.sensitive,
        default_visible: f.default_visible, options: f.options as FieldOptions, archived_at: null as string | null,
      };
      return existingIds.has(f.id)
        ? sb.from('dashboard_fields').update(row).eq('id', f.id).eq('dashboard_id', dashboardId)
        : sb.from('dashboard_fields').insert({ ...row, id: f.id, dashboard_id: dashboardId });
    });
    const results = await Promise.all(writes);
    const bad = results.find((r) => r.error);
    if (bad?.error) return fail(bad.error.message);

    const removed = [...existingIds].filter((id) => !ids.has(id));
    if (removed.length) await sb.from('dashboard_fields').update({ archived_at: now }).in('id', removed).eq('dashboard_id', dashboardId);

    // refresh indexed columns (start/end/amount/status) in case roles changed
    await sb.rpc('resync_project_columns', { p_dashboard_id: dashboardId });

    await logActivity(sb, { dashboard_id: dashboardId, action: 'fields.saved', summary: `Updated fields (${list.length} active${removed.length ? `, ${removed.length} archived` : ''})` });
    revalidatePath('/app', 'layout');
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}
