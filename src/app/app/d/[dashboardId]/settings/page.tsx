import { PageHead } from '@/components/ui/PageHead';
import { DashboardSettings } from '@/features/dashboards/DashboardSettings';
import { getDashboard, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Dashboard settings' };

export default async function Settings({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [d, profile] = await Promise.all([getDashboard(sb, dashboardId), getProfile(sb, user!.id)]);
  return (
    <div className="page">
      <PageHead eyebrow={`${d!.icon} ${d!.name}`} title="Settings" />
      <DashboardSettings dashboard={d!} hasUsername={!!profile.username && profile.is_public} />
    </div>
  );
}
