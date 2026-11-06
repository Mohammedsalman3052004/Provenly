import { z } from 'zod';
import type { Field, ProjectData } from '@/types';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), 'Enter a full URL starting with http(s)://');

function base(f: Field): z.ZodTypeAny {
  switch (f.type) {
    case 'text': return z.string().trim().min(1, 'Required').max(200);
    case 'longtext': return z.string().trim().min(1, 'Required').max(10000);
    case 'url': return httpUrl;
    case 'number': return z.number().finite();
    case 'currency': return z.number().int().safe();
    case 'formula': return z.number().safe();
    case 'date': return dateStr;
    case 'daterange':
      return z.object({ start: dateStr.nullish(), end: dateStr.nullish() }).refine(
        (r) => !r.start || !r.end || r.start <= r.end,
        'End must be after start',
      );
    case 'select':
    case 'status':
    case 'person': return z.string().trim().min(1, 'Required').max(120);
    case 'image': return z.string().url().max(600).refine((v) => v.startsWith('https://'), 'Image must be https');
    case 'multiselect': return z.array(z.string().trim().min(1).max(40)).max(30);
    case 'checkbox': return z.boolean();
    case 'rating': return z.number().int().min(0).max(5);
  }
}

/** Runtime Zod schema generated from a dashboard's field definitions. Unknown keys are stripped. */
export function buildProjectSchema(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    if (f.archived_at) continue;
    const s = base(f);
    const emptyToUndef = (v: unknown) => (v === '' || v === null || (Array.isArray(v) && v.length === 0 && f.type === 'multiselect') ? undefined : v);
    shape[f.id] = f.required && f.type !== 'checkbox'
      ? z.preprocess(emptyToUndef, s)
      : z.preprocess(emptyToUndef, s.optional());
  }
  return z.object(shape);
}

export function validateProjectData(
  fields: Field[],
  input: unknown,
): { ok: true; data: ProjectData } | { ok: false; errors: Record<string, string> } {
  const parsed = buildProjectSchema(fields).safeParse(input ?? {});
  if (parsed.success) {
    const data: ProjectData = {};
    for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) data[k] = v;
    return { ok: true, data };
  }
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!errors[key]) errors[key] = issue.message === 'Required' || issue.code === 'invalid_type' ? 'Required' : issue.message;
  }
  return { ok: false, errors };
}
