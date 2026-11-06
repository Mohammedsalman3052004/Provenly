import { PageHead } from '@/components/ui/PageHead';
import { FieldEditor } from '@/features/fields/FieldEditor';
import { getDashboard, getFields, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Fields' };

export default async function Fields({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [d, fields, profile] = await Promise.all([getDashboard(sb, dashboardId), getFields(sb, dashboardId), getProfile(sb, user!.id)]);
  return (
    <div className="page">
      <PageHead eyebrow={`${d!.icon} ${d!.name}`} title="Fields" desc="Choose what you track. “Meaning” tells analytics which field is revenue, expenses, client, status and so on." />
      <FieldEditor dashboardId={dashboardId} initial={fields} defaultCurrency={profile.base_currency} />
    </div>
  );
}
