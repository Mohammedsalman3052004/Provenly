import { AccountForm } from '@/features/profile/AccountForm';
import { PageHead } from '@/components/ui/PageHead';
import { SITE_URL } from '@/lib/config';
import { getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Account' };

export default async function Account() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const profile = await getProfile(sb, user!.id);
  return (
    <div className="page">
      <PageHead eyebrow={user?.email ?? ''} title="Account & public profile" desc="Your public page shows only the dashboards you publish, with project counts and a delivery heatmap. Never project details." />
      <AccountForm profile={profile} siteUrl={SITE_URL} />
    </div>
  );
}
