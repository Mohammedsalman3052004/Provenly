import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const fail = (error: string, fieldErrors?: Record<string, string>): { ok: false; error: string; fieldErrors?: Record<string, string> } => ({ ok: false, error, fieldErrors });
export const done = <T,>(data: T): { ok: true; data: T } => ({ ok: true, data });

export async function requireUser(): Promise<{ sb: SupabaseClient; user: User }> {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return { sb, user: data.user };
}

export async function logActivity(
  sb: SupabaseClient,
  e: { dashboard_id?: string | null; project_id?: string | null; action: string; summary: string },
) {
  await sb.from('activity_log').insert({ dashboard_id: e.dashboard_id ?? null, project_id: e.project_id ?? null, action: e.action, summary: e.summary.slice(0, 200) });
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}
