'use server';
import dns from 'node:dns/promises';
import net from 'node:net';
import { revalidatePath } from 'next/cache';
import { done, errMsg, fail, logActivity, requireUser, type ActionResult } from '@/lib/actions';
import { computeFormulas, titleOf } from '@/lib/project-data';
import { validateProjectData } from '@/lib/validators/project';
import { uuidSchema } from '@/lib/validators/schemas';
import { getFields } from '@/lib/data';
import type { Field, ProjectData } from '@/types';

type FormResult<T = undefined> = ActionResult<T>;

async function loadFields(dashboardId: string): Promise<{ sb: Awaited<ReturnType<typeof requireUser>>['sb']; fields: Field[]; all: Field[] } | null> {
  if (!uuidSchema.safeParse(dashboardId).success) return null;
  const { sb } = await requireUser();
  const all = await getFields(sb, dashboardId, true);
  if (!all.length) return null;
  return { sb, fields: all.filter((f) => !f.archived_at), all };
}

export async function createProject(dashboardId: string, raw: unknown): Promise<FormResult<{ id: string }>> {
  try {
    const ctx = await loadFields(dashboardId);
    if (!ctx) return fail('Dashboard not found');
    const v = validateProjectData(ctx.fields, raw);
    if (!v.ok) return fail('Please fix the highlighted fields.', v.errors);
    const data = computeFormulas(ctx.fields, v.data);
    const { data: row, error } = await ctx.sb.from('projects').insert({ dashboard_id: dashboardId, data }).select('id').single();
    if (error || !row) return fail(error?.message ?? 'Could not save');
    await logActivity(ctx.sb, { dashboard_id: dashboardId, project_id: row.id, action: 'project.created', summary: `Added “${titleOf(ctx.fields, data)}”` });
    revalidatePath('/app', 'layout');
    return done({ id: row.id });
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function updateProject(projectId: string, raw: unknown): Promise<FormResult> {
  try {
    if (!uuidSchema.safeParse(projectId).success) return fail('Invalid project');
    const { sb } = await requireUser();
    const { data: p } = await sb.from('projects').select('dashboard_id,data').eq('id', projectId).is('deleted_at', null).single();
    if (!p) return fail('Project not found');
    const ctx = await loadFields(p.dashboard_id);
    if (!ctx) return fail('Dashboard not found');
    const v = validateProjectData(ctx.fields, raw);
    if (!v.ok) return fail('Please fix the highlighted fields.', v.errors);
    // keep values of archived fields so restoring a field never loses data
    const archivedIds = new Set(ctx.all.filter((f) => f.archived_at).map((f) => f.id));
    const kept: ProjectData = {};
    for (const [k, val] of Object.entries(p.data as ProjectData)) if (archivedIds.has(k)) kept[k] = val;
    const data = { ...kept, ...computeFormulas(ctx.fields, v.data) };
    const { error } = await sb.from('projects').update({ data }).eq('id', projectId);
    if (error) return fail(error.message);
    await logActivity(sb, { dashboard_id: p.dashboard_id, project_id: projectId, action: 'project.updated', summary: `Edited “${titleOf(ctx.fields, data)}”` });
    revalidatePath('/app', 'layout');
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}

/** Single-value update (board drag & drop). Re-validates only that field and recomputes formulas. */
export async function setProjectValue(projectId: string, fieldId: string, value: unknown): Promise<FormResult> {
  try {
    if (!uuidSchema.safeParse(projectId).success || !uuidSchema.safeParse(fieldId).success) return fail('Invalid input');
    const { sb } = await requireUser();
    const { data: p } = await sb.from('projects').select('dashboard_id,data').eq('id', projectId).is('deleted_at', null).single();
    if (!p) return fail('Project not found');
    const ctx = await loadFields(p.dashboard_id);
    const field = ctx?.fields.find((f) => f.id === fieldId);
    if (!ctx || !field) return fail('Field not found');
    const v = validateProjectData([{ ...field, required: false }], { [fieldId]: value });
    if (!v.ok) return fail(Object.values(v.errors)[0] ?? 'Invalid value');
    const next: ProjectData = { ...(p.data as ProjectData) };
    if (fieldId in v.data) next[fieldId] = v.data[fieldId]; else delete next[fieldId];
    const { error } = await sb.from('projects').update({ data: computeFormulas(ctx.fields, next) }).eq('id', projectId);
    if (error) return fail(error.message);
    await logActivity(sb, { dashboard_id: p.dashboard_id, project_id: projectId, action: 'project.updated', summary: `Changed ${field.name} on “${titleOf(ctx.fields, next)}”` });
    revalidatePath('/app', 'layout');
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function deleteProjects(ids: string[]): Promise<FormResult<{ count: number }>> {
  try {
    const clean = ids.filter((i) => uuidSchema.safeParse(i).success).slice(0, 500);
    if (!clean.length) return fail('Nothing selected');
    const { sb } = await requireUser();
    const { data: rows, error } = await sb.from('projects').update({ deleted_at: new Date().toISOString() }).in('id', clean).select('id,dashboard_id');
    if (error) return fail(error.message);
    const dash = rows?.[0]?.dashboard_id as string | undefined;
    await logActivity(sb, { dashboard_id: dash, project_id: clean.length === 1 ? clean[0] : null, action: 'project.deleted', summary: `Deleted ${rows?.length ?? 0} project(s)` });
    revalidatePath('/app', 'layout');
    return done({ count: rows?.length ?? 0 });
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function restoreProjects(ids: string[]): Promise<FormResult> {
  try {
    const clean = ids.filter((i) => uuidSchema.safeParse(i).success).slice(0, 500);
    const { sb } = await requireUser();
    await sb.from('projects').update({ deleted_at: null }).in('id', clean);
    revalidatePath('/app', 'layout');
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function importProjects(dashboardId: string, rows: unknown[]): Promise<FormResult<{ imported: number; skipped: { row: number; reason: string }[] }>> {
  try {
    const ctx = await loadFields(dashboardId);
    if (!ctx) return fail('Dashboard not found');
    if (!Array.isArray(rows) || rows.length > 2000) return fail('Import up to 2,000 rows at a time.');
    const good: { dashboard_id: string; data: ProjectData }[] = [];
    const skipped: { row: number; reason: string }[] = [];
    rows.forEach((r, i) => {
      const v = validateProjectData(ctx.fields, r);
      if (v.ok) good.push({ dashboard_id: dashboardId, data: computeFormulas(ctx.fields, v.data) });
      else skipped.push({ row: i + 1, reason: Object.values(v.errors)[0] ?? 'Invalid' });
    });
    for (let i = 0; i < good.length; i += 200) {
      const { error } = await ctx.sb.from('projects').insert(good.slice(i, i + 200));
      if (error) return fail(error.message);
    }
    await logActivity(ctx.sb, { dashboard_id: dashboardId, action: 'project.imported', summary: `Imported ${good.length} project(s) from CSV` });
    revalidatePath('/app', 'layout');
    return done({ imported: good.length, skipped: skipped.slice(0, 20) });
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function getProjectActivity(projectId: string) {
  if (!uuidSchema.safeParse(projectId).success) return [];
  const { sb } = await requireUser();
  const { data } = await sb.from('activity_log').select('id,action,summary,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(15);
  return (data ?? []) as { id: string; action: string; summary: string; created_at: string }[];
}

/** Cmd+K project search (RLS-scoped). */
export async function searchProjects(q: string): Promise<{ id: string; dashboard_id: string; title: string; dashboard: string }[]> {
  const term = q.trim().replace(/[%,()]/g, '');
  if (term.length < 2) return [];
  const { sb } = await requireUser();
  const { data: dashes } = await sb.from('dashboards').select('id,name').is('deleted_at', null).limit(12);
  const out: { id: string; dashboard_id: string; title: string; dashboard: string }[] = [];
  await Promise.all((dashes ?? []).map(async (d) => {
    const { data: tf } = await sb.from('dashboard_fields').select('id').eq('dashboard_id', d.id).eq('role', 'title').is('archived_at', null).limit(1).maybeSingle();
    if (!tf) return;
    const { data: rows } = await sb.from('projects').select('id,data').eq('dashboard_id', d.id).is('deleted_at', null).filter(`data->>${tf.id}`, 'ilike', `%${term}%`).limit(5);
    for (const r of rows ?? []) out.push({ id: r.id, dashboard_id: d.id, title: String((r.data as ProjectData)[tf.id] ?? 'Untitled'), dashboard: d.name });
  }));
  return out.slice(0, 10);
}

// ---------- URL preview (server side, SSRF-guarded) ----------
function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80') || ip.startsWith('::ffff:');
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

export async function fetchUrlMeta(url: string): Promise<{ title: string | null; image: string | null; favicon: string | null } | null> {
  try {
    await requireUser();
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || u.hostname === 'localhost') return null;
    const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true });
    if (addrs.some((a) => isPrivateIp(a.address))) return null;
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(4000), redirect: 'manual', headers: { 'user-agent': 'ProvenlyBot/1.0' } });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return { title: null, image: null, favicon: `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64` };
    const html = (await res.text()).slice(0, 300_000);
    const meta = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))?.[1] ?? null;
    let image = meta('og:image');
    if (image) { try { image = new URL(image, u).toString(); if (!image.startsWith('https://')) image = null; } catch { image = null; } }
    const title = meta('og:title') ?? html.match(/<title[^>]*>([^<]{1,160})<\/title>/i)?.[1]?.trim() ?? null;
    return { title, image, favicon: `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64` };
  } catch {
    return null;
  }
}
