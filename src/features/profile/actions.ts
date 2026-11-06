'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { done, errMsg, fail, requireUser, type ActionResult } from '@/lib/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { profileSchema } from '@/lib/validators/schemas';

export async function updateProfile(input: unknown): Promise<ActionResult> {
  try {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check your details', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
    const v = parsed.data;
    if (v.is_public && !v.username) return fail('Choose a username to make your profile public.', { username: 'Required for a public profile' });
    if (v.goal_type && !v.goal_value) return fail('Enter a goal amount.', { goal_value: 'Required' });
    const { sb, user } = await requireUser();
    const { error } = await sb.from('profiles').update({
      display_name: v.display_name, username: v.username || null, bio: v.bio || null, base_currency: v.base_currency,
      is_public: v.is_public, goal_type: v.goal_type, goal_value: v.goal_type ? v.goal_value : null, goal_period: v.goal_period,
    }).eq('id', user.id);
    if (error) return fail(error.code === '23505' ? 'That username is taken.' : error.message, error.code === '23505' ? { username: 'Taken' } : undefined);
    revalidatePath('/app', 'layout');
    if (v.username) revalidatePath(`/u/${v.username}`);
    return done(undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function deleteAccount(confirm: string): Promise<ActionResult> {
  try {
    if (confirm !== 'DELETE') return fail('Type DELETE to confirm.');
    const { sb, user } = await requireUser();
    const { error } = await createAdminClient().auth.admin.deleteUser(user.id); // cascades to every table
    if (error) return fail(error.message);
    await sb.auth.signOut();
  } catch (e) {
    return fail(errMsg(e));
  }
  redirect('/?deleted=1');
}
