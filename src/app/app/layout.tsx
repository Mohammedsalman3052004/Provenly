import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { getDashboards, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect('/login');
  const [profile, dashboards] = await Promise.all([getProfile(sb, data.user.id), getDashboards(sb)]);
  const name = profile.display_name ?? data.user.email?.split('@')[0] ?? 'You';
  return <AppShell dashboards={dashboards} user={{ name, avatar: profile.avatar_url, username: profile.username }}>{children}</AppShell>;
}
