'use client';
import { useEffect, useState } from 'react';
import { Overlay } from '@/components/ui/Modal';
import { ProjectForm } from '@/features/projects/ProjectForm';
import { DetailList } from '@/features/projects/Views';
import { TitleCell, type Row } from '@/features/projects/cells';
import { getProjectActivity } from '@/features/projects/actions';
import { timeAgo } from '@/lib/format';
import type { Field } from '@/types';

export function ProjectDrawer({ dashboardId, fields, row, userId, suggestions, onClose, onDelete }: {
  dashboardId: string; fields: Field[]; row: Row; userId: string; suggestions: Record<string, string[]>; onClose: () => void; onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [log, setLog] = useState<{ id: string; summary: string; created_at: string }[]>([]);
  useEffect(() => { void getProjectActivity(row.id).then(setLog); }, [row.id]);
  return (
    <Overlay kind="drawer" onClose={onClose} label="Project details">
      <div className="row between"><span className="eyebrow">Project</span><button className="btn btn-sm btn-icon" onClick={onClose} aria-label="Close">✕</button></div>
      {editing ? (
        <div style={{ marginTop: 18 }}>
          <ProjectForm dashboardId={dashboardId} fields={fields} userId={userId} suggestions={suggestions} project={row} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <>
          <div style={{ margin: '14px 0 22px' }}><TitleCell fields={fields} data={row.data} /></div>
          <DetailList fields={fields} row={row} />
          <div className="row" style={{ marginTop: 28 }}>
            <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn btn-danger" onClick={() => { onDelete(row.id); onClose(); }}>Delete</button>
          </div>
          {log.length > 0 && (
            <>
              <hr className="rule" />
              <h3 style={{ fontSize: 22, marginBottom: 10 }}>Timeline</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {log.map((l) => <li key={l.id} className="row between" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}><span>{l.summary}</span><span className="faint" style={{ fontSize: 12.5 }}>{timeAgo(l.created_at)}</span></li>)}
              </ul>
            </>
          )}
        </>
      )}
    </Overlay>
  );
}
