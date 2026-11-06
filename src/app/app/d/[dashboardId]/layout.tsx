import { notFound } from 'next/navigation';
import { getDashboard } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/lib/validators/schemas';

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  if (!uuidSchema.safeParse(dashboardId).success) notFound();
  const d = await getDashboard(await createClient(), dashboardId);
  if (!d) notFound();
  return <>{children}</>;
}
