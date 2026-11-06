import { PageHead } from '@/components/ui/PageHead';
import { ShareManager } from '@/features/share/ShareManager';
import { getDashboard, getFields, getShareLinks } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Share' };

export default async function Share({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  const sb = await createClient();
  const [d, fields, links] = await Promise.all([getDashboard(sb, dashboardId), getFields(sb, dashboardId), getShareLinks(sb, dashboardId)]);
  return (
    <div className="page" style={{ maxWidth: 1480 }}>
      <PageHead eyebrow={`${d!.icon} ${d!.name}`} title="Share" desc="Each link has its own hidden fields, password and expiry. Hidden values are removed on the server before anything is sent." />
      <ShareManager dashboardId={dashboardId} fields={fields} links={links} />
    </div>
  );
}
