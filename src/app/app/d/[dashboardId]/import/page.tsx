import { PageHead } from '@/components/ui/PageHead';
import { ImportWizard } from '@/features/projects/ImportWizard';
import { getDashboard, getFields } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Import CSV' };

export default async function Import({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  const sb = await createClient();
  const [d, fields] = await Promise.all([getDashboard(sb, dashboardId), getFields(sb, dashboardId)]);
  return (
    <div className="page">
      <PageHead eyebrow={`${d!.icon} ${d!.name}`} title="Import from CSV" desc="Match your columns to this dashboard’s fields. Money is read as normal decimals (1500.50)." />
      <ImportWizard dashboardId={dashboardId} fields={fields} />
    </div>
  );
}
