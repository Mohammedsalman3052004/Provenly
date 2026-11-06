'use server';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { done, errMsg, fail, logActivity, requireUser, type ActionResult } from '@/lib/actions';
import { createPublicClient } from '@/lib/supabase/public';
import { shareLinkSchema, uuidSchema } from '@/lib/validators/schemas';
import { buildViewModel, type SharedViewModel } from '@/features/share/viewmodel';
import type { SharedPayload } from '@/types';

function parseInput(input: unknown) {
  const p = shareLinkSchema.safeParse(input);
  if (!p.success) return { ok: false as const, error: 'Please check the link settings.' };
  const v = p.data;
  const expires = v.expires_at ? new Date(v.expires_at) : null;
  if (expires && Number.isNaN(expires.getTime())) return { ok: false as const, error: 'Invalid expiry date.' };
  return { ok: true as const, v, expires };
}

export async function createShareLink(dashboardId: string, input: unknown): Promise<ActionResult<{ id: string; token: string }>> {
  try {
    if (!uuidSchema.safeParse(dashboardId).success) return fail('Invalid dashboard');
    const parsed = parseInput(input);
    if (!parsed.ok) return fail(parsed.error);
    const { v, expires } = parsed;
    const { sb } = await requireUser();
    const { data, error } = await sb.from('share_links').insert({
      dashboard_id: dashboardId, name: v.name, hidden_field_ids: v.hidden_field_ids, views: v.views,
      date_from: v.date_from, date_to: v.date_to, expires_at: expires?.toISOString() ?? null, noindex: v.noindex,
    }).select('id,token').single();
    if (error || !data) return fail(error?.message ?? 'Could not create link');
    if (v.password) await sb.rpc('set_share_password', { p_link_id: data.id, p_password: v.password });
    await logActivity(sb, { dashboard_id: dashboardId, action: 'share.created', summary: `Created share link “${v.name}”` });
    revalidatePath('/app', 'layout');
    return done({ id: data.id, token: data.token });
  } catch (e) {
    return fail(errMsg(e));
  }
}

/** password: undefined = keep, '' = remove, text = set */
export async function updateShareLink(linkId: string, input: unknown): Promise<ActionResult> {
  try {
    if (!uuidSchema.safeParse(linkId).success) return fail('Invalid link');
    const parsed = parseInput(input);
    if (!parsed.ok) return fail(parsed.error);
    const { v, expires } = parsed;
    const { sb } = await requireUser();
    const { error } = await sb.from('share_links').update({
      name: v.name, hidden_field_ids: v.hidden_field_ids, views: v.views, date_from: v.date_from, date_to: v.date_to,
      expires_at: expires?.toISOString() ?? null, noindex: v.noindex,
    }).eq('id', linkId);
    if (error) return fail(error.message);
    if (v.password !== undefined) await sb.rpc('set_share_password', { p_link_id: linkId, p_password: v.password });
    revalidatePath('/app', 'layout');
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function setShareRevoked(linkId: string, revoked: boolean): Promise<ActionResult> {
  try {
    if (!uuidSchema.safeParse(linkId).success) return fail('Invalid link');
    const { sb } = await requireUser();
    const { error } = await sb.from('share_links').update({ revoked_at: revoked ? new Date().toISOString() : null }).eq('id', linkId);
    if (error) return fail(error.message);
    revalidatePath('/app', 'layout');
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function deleteShareLink(linkId: string): Promise<ActionResult> {
  try {
    if (!uuidSchema.safeParse(linkId).success) return fail('Invalid link');
    const { sb } = await requireUser();
    await sb.from('share_links').delete().eq('id', linkId);
    revalidatePath('/app', 'layout');
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}

/** "Preview as viewer" with unsaved settings. Same database function as the public page, so what you see is what they get. */
export async function previewShare(dashboardId: string, input: { hidden: string[]; date_from: string | null; date_to: string | null; views: string[] }): Promise<ActionResult<SharedViewModel>> {
  try {
    if (!uuidSchema.safeParse(dashboardId).success) return fail('Invalid dashboard');
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc('preview_share_config', {
      p_dashboard_id: dashboardId,
      p_hidden: input.hidden.filter((i) => uuidSchema.safeParse(i).success),
      p_from: input.date_from || null,
      p_to: input.date_to || null,
      p_views: input.views,
    });
    if (error || !data) return fail(error?.message ?? 'Preview unavailable');
    return done(buildViewModel(data as SharedPayload));
  } catch (e) {
    return fail(errMsg(e));
  }
}

const cookieName = (token: string) => `fbs_${token.slice(0, 16)}`;

/** Public: verify a link password; on success keep it in an httpOnly cookie scoped to that link. */
export async function unlockShare(token: string, password: string): Promise<'ok' | 'wrong' | 'locked' | 'unavailable'> {
  if (!/^[a-f0-9]{48}$/.test(token) || !password || password.length > 100) return 'unavailable';
  const { data } = await createPublicClient().rpc('get_shared_dashboard', { p_token: token, p_password: password, p_referrer: null, p_count: false });
  const status = (data as { status?: string } | null)?.status;
  if (status === 'ok') {
    (await cookies()).set(cookieName(token), password, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: `/s/${token}`, maxAge: 60 * 60 * 6,
    });
    return 'ok';
  }
  if (status === 'wrong_password') return 'wrong';
  if (status === 'locked') return 'locked';
  return 'unavailable';
}

export async function readShare(token: string, opts: { count: boolean }): Promise<{ status: string; name?: string; vm?: SharedViewModel; noindex?: boolean }> {
  if (!/^[a-f0-9]{48}$/.test(token)) return { status: 'unavailable' };
  const pw = (await cookies()).get(cookieName(token))?.value ?? null;
  const ref = (await headers()).get('referer');
  let referrer: string | null = null;
  try { referrer = ref ? new URL(ref).hostname : null; } catch { referrer = null; }
  const { data } = await createPublicClient().rpc('get_shared_dashboard', { p_token: token, p_password: pw, p_referrer: referrer, p_count: opts.count });
  const res = data as ({ status: string; name?: string } & Partial<SharedPayload>) | null;
  if (!res) return { status: 'unavailable' };
  if (res.status !== 'ok') return { status: res.status, name: res.name };
  return { status: 'ok', vm: buildViewModel(res as SharedPayload), noindex: res.link?.noindex ?? true };
}
