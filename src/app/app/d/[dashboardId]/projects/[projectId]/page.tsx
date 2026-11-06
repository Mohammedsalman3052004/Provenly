import { redirect } from 'next/navigation';

export default async function ProjectRedirect({ params }: { params: Promise<{ dashboardId: string; projectId: string }> }) {
  const { dashboardId, projectId } = await params;
  redirect(`/app/d/${dashboardId}/projects?open=${projectId}`);
}
