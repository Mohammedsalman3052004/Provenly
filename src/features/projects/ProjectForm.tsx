'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FieldInput } from '@/components/ui/FieldInput';
import { useToast } from '@/components/ui/Toast';
import { createProject, fetchUrlMeta, updateProject } from '@/features/projects/actions';
import { validateProjectData } from '@/lib/validators/project';
import { cn, domainOf } from '@/lib/format';
import type { Field, ProjectData } from '@/types';

interface Props {
  dashboardId: string;
  fields: Field[];
  userId: string;
  suggestions: Record<string, string[]>;
  project?: { id: string; data: ProjectData };
  onSaved?: () => void;
  onCancel?: () => void;
}

export function ProjectForm({ dashboardId, fields, userId, suggestions, project, onSaved, onCancel }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const draftKey = `fb-draft-${dashboardId}`;
  const [data, setData] = useState<ProjectData>(project?.data ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ title: string | null; image: string | null; favicon: string | null; url: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [draftFound, setDraftFound] = useState(false);

  useEffect(() => {
    if (project) return;
    try { const d = localStorage.getItem(draftKey); if (d && Object.keys(JSON.parse(d)).length) setDraftFound(true); } catch { /* ignore */ }
  }, [draftKey, project]);

  useEffect(() => {
    if (project) return;
    const t = setTimeout(() => { try { if (Object.keys(data).length) localStorage.setItem(draftKey, JSON.stringify(data)); else localStorage.removeItem(draftKey); } catch { /* ignore */ } }, 600);
    return () => clearTimeout(t);
  }, [data, draftKey, project]);

  const set = useCallback((id: string, v: unknown) => {
    setData((d) => { const n = { ...d }; if (v === undefined || v === '') delete n[id]; else n[id] = v; return n; });
    setErrors((e) => { if (!e[id]) return e; const n = { ...e }; delete n[id]; return n; });
  }, []);

  const thumbField = fields.find((f) => f.role === 'thumbnail');
  const sections = useMemo(() => {
    const main = fields.filter((f) => !['longtext', 'image'].includes(f.type));
    return { main, wide: fields.filter((f) => ['longtext', 'image'].includes(f.type)) };
  }, [fields]);

  async function onUrl(field: Field, url: string) {
    if (field.role !== 'url') return;
    const m = await fetchUrlMeta(url);
    if (m) setMeta({ ...m, url });
  }

  async function submit(another: boolean) {
    const v = validateProjectData(fields, data);
    if (!v.ok) { setErrors(v.errors); toast('Please fix the highlighted fields.', { kind: 'err' }); formRef.current?.querySelector<HTMLElement>('.err')?.focus(); return; }
    setBusy(true);
    const res = project ? await updateProject(project.id, data) : await createProject(dashboardId, data);
    setBusy(false);
    if (!res.ok) { setErrors(res.fieldErrors ?? {}); toast(res.error, { kind: 'err' }); return; }
    toast(project ? 'Project updated' : 'Project added');
    if (!project) { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } }
    if (another && !project) { setData({}); setMeta(null); window.scrollTo({ top: 0, behavior: 'smooth' }); router.refresh(); return; }
    onSaved?.();
    if (!project) router.push(`/app/d/${dashboardId}/projects`);
    router.refresh();
  }

  const render = (f: Field) => (
    <div key={f.id} className={cn(['longtext', 'image', 'multiselect'].includes(f.type) && 'full')}>
      <label className="label">{f.name}{f.required && <b> *</b>}</label>
      <FieldInput field={f} value={data[f.id]} onChange={(v) => set(f.id, v)} error={errors[f.id]} data={data} userId={userId} suggestions={suggestions[f.id]} onBlurUrl={(u) => onUrl(f, u)} />
      {errors[f.id] && <div className="field-err">{errors[f.id]}</div>}
      {f.role === 'url' && meta && (
        <div className="row" style={{ marginTop: 10, alignItems: 'flex-start' }}>
          {meta.image ? <img src={meta.image} alt="" className="thumb" style={{ width: 96, height: 60 }} /> : null}
          <div className="grow">
            <div className="row gap-sm">{meta.favicon && <img src={meta.favicon} alt="" className="fav" />}<b style={{ fontWeight: 500 }}>{meta.title ?? domainOf(meta.url)}</b></div>
            {thumbField && meta.image && <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => { set(thumbField.id, meta.image); toast('Preview image set as thumbnail'); }}>Use as thumbnail</button>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <form
      ref={formRef} noValidate
      onSubmit={(e) => { e.preventDefault(); void submit(false); }}
      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void submit(false); } }}
    >
      {draftFound && !project && (
        <div className="row between wrap" style={{ marginBottom: 20 }}>
          <span className="muted">You have an unsaved draft.</span>
          <span className="row gap-sm">
            <button type="button" className="btn btn-sm" onClick={() => { try { setData(JSON.parse(localStorage.getItem(draftKey)!)); } catch { /* ignore */ } setDraftFound(false); }}>Restore draft</button>
            <button type="button" className="btn btn-sm" onClick={() => { localStorage.removeItem(draftKey); setDraftFound(false); }}>Discard</button>
          </span>
        </div>
      )}
      <div className="form-grid">
        {sections.main.map(render)}
        {sections.wide.map(render)}
      </div>
      <div className="row wrap" style={{ marginTop: 32 }}>
        <button className="btn btn-primary" disabled={busy} type="submit">{busy ? 'Saving…' : project ? 'Save changes' : 'Save project'}</button>
        {!project && <button className="btn" type="button" disabled={busy} onClick={() => void submit(true)}>Save and add another</button>}
        {onCancel && <button className="btn" type="button" onClick={onCancel}>Cancel</button>}
        <span className="hint hide-sm" style={{ margin: 0 }}><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save</span>
      </div>
    </form>
  );
}
