'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProTable } from '@/features/projects/ProTable';
import type { Field, Project } from '@/types';

export function OverviewTable({ dashboardId, fields, projects }: { dashboardId: string; fields: Field[]; projects: Project[] }) {
  const router = useRouter();
  const rows = projects.slice(0, 8).map((p) => ({ id: p.id, data: p.data }));
  return (
    <>
      <ProTable fields={fields} rows={rows} storageKey={`overview-${dashboardId}`} readOnly minimal onOpen={(id) => router.push(`/app/d/${dashboardId}/projects?open=${id}`)} />
      <div className="row between wrap" style={{ marginTop: 14 }}>
        <span className="muted">Showing {rows.length} of {projects.length} projects</span>
        <Link className="btn btn-sm btn-primary" href={`/app/d/${dashboardId}/projects`}>View all projects →</Link>
      </div>
    </>
  );
}
