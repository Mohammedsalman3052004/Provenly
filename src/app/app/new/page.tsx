import { NewDashboardWizard } from '@/features/dashboards/NewDashboardWizard';
import { PageHead } from '@/components/ui/PageHead';
import { getDashboards, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'New dashboard' };

export default async function NewDashboard() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [profile, dashboards] = await Promise.all([getProfile(sb, user!.id), getDashboards(sb)]);
  return (
    <div className="page">
      <PageHead eyebrow={dashboards.length ? 'New dashboard' : 'Welcome — step 1 of 3'} title="Set up a dashboard" desc="Each dashboard is its own separate workspace with its own fields, projects and share links." />
      <NewDashboardWizard defaultCurrency={profile.base_currency} first={dashboards.length === 0} />
    </div>
  );
}
