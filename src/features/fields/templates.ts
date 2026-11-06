import { DEFAULT_STATUS_CHOICES } from '@/lib/project-data';
import type { FieldOptions, FieldRole, FieldType } from '@/types';

export interface TemplateField {
  key: string;
  name: string;
  type: FieldType;
  role: FieldRole | null;
  required?: boolean;
  sensitive?: boolean;
  options?: FieldOptions;
  /** formula refs by template key; resolved to field ids on creation */
  formula?: { op: 'subtract' | 'add' | 'multiply'; a: string; b: string };
}
export interface Template { id: string; name: string; blurb: string; icon: string; fields: TemplateField[] }

const status = (): TemplateField => ({ key: 'status', name: 'Status', type: 'status', role: 'status', options: { choices: DEFAULT_STATUS_CHOICES } });
const money = (key: string, name: string, role: FieldRole): TemplateField => ({ key, name, type: 'currency', role, sensitive: true });

export const TEMPLATES: Template[] = [
  {
    id: 'freelancing', name: 'Freelancing Projects', icon: '◆',
    blurb: 'Name, URL, amount, dates, money spent, profit, client, status, tags, thumbnail, description.',
    fields: [
      { key: 'name', name: 'Project Name', type: 'text', role: 'title', required: true },
      { key: 'url', name: 'Project URL', type: 'url', role: 'url' },
      money('amount', 'Project Amount', 'amount'),
      { key: 'start', name: 'Start Date', type: 'date', role: 'start' },
      { key: 'end', name: 'End Date', type: 'date', role: 'end' },
      money('spent', 'Money Spent', 'spent'),
      { key: 'profit', name: 'Profit', type: 'formula', role: 'profit', sensitive: true, formula: { op: 'subtract', a: 'amount', b: 'spent' } },
      { key: 'client', name: 'Client / Source', type: 'person', role: 'client', sensitive: true },
      status(),
      { key: 'tags', name: 'Tags', type: 'multiselect', role: 'tags' },
      { key: 'thumb', name: 'Thumbnail', type: 'image', role: 'thumbnail' },
      { key: 'desc', name: 'Description', type: 'longtext', role: 'description' },
    ],
  },
  {
    id: 'agency', name: 'Agency Websites', icon: '▤',
    blurb: 'Sites you built for one company: live URL, contract value, cost, stack, status.',
    fields: [
      { key: 'name', name: 'Website Name', type: 'text', role: 'title', required: true },
      { key: 'url', name: 'Live URL', type: 'url', role: 'url' },
      { key: 'client', name: 'Client', type: 'person', role: 'client' },
      money('amount', 'Contract Value', 'amount'),
      money('spent', 'Cost', 'spent'),
      { key: 'profit', name: 'Profit', type: 'formula', role: 'profit', sensitive: true, formula: { op: 'subtract', a: 'amount', b: 'spent' } },
      { key: 'start', name: 'Started', type: 'date', role: 'start' },
      { key: 'end', name: 'Launched', type: 'date', role: 'end' },
      { key: 'tags', name: 'Stack', type: 'multiselect', role: 'tags' },
      status(),
      { key: 'thumb', name: 'Screenshot', type: 'image', role: 'thumbnail' },
      { key: 'desc', name: 'Notes', type: 'longtext', role: 'description' },
    ],
  },
  {
    id: 'design', name: 'Design Work', icon: '◐',
    blurb: 'Brand, UI and print work with fee, category, delivery date and a rating.',
    fields: [
      { key: 'name', name: 'Project Name', type: 'text', role: 'title', required: true },
      { key: 'url', name: 'Link', type: 'url', role: 'url' },
      { key: 'client', name: 'Client', type: 'person', role: 'client' },
      money('amount', 'Fee', 'amount'),
      { key: 'start', name: 'Started', type: 'date', role: 'start' },
      { key: 'end', name: 'Delivered', type: 'date', role: 'end' },
      { key: 'tags', name: 'Category', type: 'multiselect', role: 'tags' },
      status(),
      { key: 'rating', name: 'Self rating', type: 'rating', role: null },
      { key: 'thumb', name: 'Cover', type: 'image', role: 'thumbnail' },
      { key: 'desc', name: 'Brief', type: 'longtext', role: 'description' },
    ],
  },
  {
    id: 'opensource', name: 'Open Source', icon: '◈',
    blurb: 'Repositories and contributions with stars, language and role. No money fields.',
    fields: [
      { key: 'name', name: 'Repository', type: 'text', role: 'title', required: true },
      { key: 'url', name: 'Repo URL', type: 'url', role: 'url' },
      { key: 'tags', name: 'Languages', type: 'multiselect', role: 'tags' },
      { key: 'stars', name: 'Stars', type: 'number', role: null },
      { key: 'start', name: 'Started', type: 'date', role: 'start' },
      { key: 'end', name: 'Last release', type: 'date', role: 'end' },
      status(),
      { key: 'thumb', name: 'Cover', type: 'image', role: 'thumbnail' },
      { key: 'desc', name: 'Description', type: 'longtext', role: 'description' },
    ],
  },
  {
    id: 'blank', name: 'Blank', icon: '○',
    blurb: 'Start with just a name and build your own fields.',
    fields: [{ key: 'name', name: 'Name', type: 'text', role: 'title', required: true }],
  },
];

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1];
}

export interface FieldInsert {
  id: string; dashboard_id: string; name: string; type: FieldType; role: FieldRole | null; position: number;
  required: boolean; sensitive: boolean; default_visible: boolean; options: FieldOptions;
}

export function instantiateTemplate(dashboardId: string, templateId: string, currency: string, keys?: string[]): FieldInsert[] {
  const t = getTemplate(templateId);
  let list = keys?.length ? t.fields.filter((f) => keys.includes(f.key) || f.role === 'title') : t.fields;
  // a formula needs both inputs; drop it if either was unticked
  list = list.filter((f) => !f.formula || (list.some((x) => x.key === f.formula!.a) && list.some((x) => x.key === f.formula!.b)));
  const ids = new Map(list.map((f) => [f.key, crypto.randomUUID()]));
  return list.map((f, i) => {
    const options: FieldOptions = { ...(f.options ?? {}) };
    if (f.type === 'currency' || f.type === 'formula') options.currency = currency;
    if (f.formula) options.formula = { op: f.formula.op, a: ids.get(f.formula.a)!, b: ids.get(f.formula.b)! };
    return {
      id: ids.get(f.key)!, dashboard_id: dashboardId, name: f.name, type: f.type, role: f.role, position: i,
      required: !!f.required, sensitive: !!f.sensitive, default_visible: true, options,
    };
  });
}

/** Role-based sample rows so any schema gets believable demo data. */
export function sampleProjects(fields: { id: string; role: FieldRole | null; type: FieldType; options: FieldOptions }[], currency: string) {
  const by = (r: FieldRole) => fields.find((f) => f.role === r);
  const names = ['Aurora Interiors', 'Northwind Realty', 'Kite & Co. Store', 'Lumen Studio', 'Greenleaf Clinic', 'Orbit CRM Dashboard', 'Saffron Bistro', 'Atlas Logistics'];
  const clients = ['Aurora Group', 'Northwind', 'Kite & Co.', 'Lumen', 'Greenleaf', 'Orbit Labs'];
  const tagSets = [['Next.js', 'Supabase'], ['Webflow'], ['React', 'GSAP'], ['HTML', 'CSS', 'JS'], ['Next.js', 'Stripe']];
  const minor = currency === 'JPY' ? 1 : 100;
  const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
  const sc = by('status')?.options.choices ?? DEFAULT_STATUS_CHOICES;
  return names.map((name, i) => {
    const d: Record<string, unknown> = {};
    const set = (r: FieldRole, v: unknown) => { const f = by(r); if (f) d[f.id] = v; };
    const amount = (18000 + ((i * 7919) % 9) * 6500) * minor;
    const spent = Math.round(amount * (0.12 + (i % 4) * 0.05));
    const startOff = 200 - i * 24, endOff = startOff - (14 + (i % 3) * 9);
    set('title', name);
    set('url', `https://example.com/${name.toLowerCase().replace(/[^a-z]+/g, '-')}`);
    set('amount', amount);
    set('spent', spent);
    set('start', day(startOff));
    set('end', i === 7 ? day(-10) : day(endOff));
    set('client', clients[i % clients.length]);
    set('tags', tagSets[i % tagSets.length]);
    set('status', i === 7 ? sc[1].value : i === 6 ? sc[0].value : (sc.find((c) => c.done) ?? sc[0]).value);
    set('description', 'Sample project. Edit or delete it any time.');
    return d;
  });
}
