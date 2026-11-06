export const FIELD_TYPES = [
  'text', 'longtext', 'url', 'number', 'currency', 'date', 'daterange', 'select',
  'multiselect', 'status', 'person', 'checkbox', 'rating', 'image', 'formula',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_ROLES = [
  'title', 'url', 'amount', 'spent', 'profit', 'start', 'end', 'range', 'due',
  'client', 'status', 'tags', 'thumbnail', 'description',
] as const;
export type FieldRole = (typeof FIELD_ROLES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text', longtext: 'Long text', url: 'URL', number: 'Number', currency: 'Currency', date: 'Date',
  daterange: 'Date range', select: 'Select', multiselect: 'Tags (multi-select)', status: 'Status',
  person: 'Client / company', checkbox: 'Checkbox', rating: 'Rating', image: 'Image', formula: 'Formula',
};
export const FIELD_ROLE_LABELS: Record<FieldRole, string> = {
  title: 'Project title', url: 'Project link', amount: 'Revenue (amount)', spent: 'Expenses (money spent)',
  profit: 'Profit', start: 'Start date', end: 'End / delivery date', range: 'Date range (start → end)',
  due: 'Deadline (for on-time rate)', client: 'Client / source', status: 'Status', tags: 'Tags / category',
  thumbnail: 'Thumbnail', description: 'Description',
};

export interface Choice { value: string; color: string; done?: boolean }
export interface FormulaDef { op: 'subtract' | 'add' | 'multiply'; a: string; b: string }
export interface FieldOptions { currency?: string; choices?: Choice[]; formula?: FormulaDef }

export interface Field {
  id: string;
  dashboard_id: string;
  name: string;
  type: FieldType;
  role: FieldRole | null;
  position: number;
  required: boolean;
  sensitive: boolean;
  default_visible: boolean;
  options: FieldOptions;
  archived_at: string | null;
}

export type ProjectData = Record<string, unknown>;
export interface Project {
  id: string;
  dashboard_id: string;
  data: ProjectData;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  end_date: string | null;
  amount_minor: number | null;
  status: string | null;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  template: string;
  is_published: boolean;
  position: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  base_currency: string;
  is_public: boolean;
  goal_type: 'revenue' | 'projects' | null;
  goal_value: number | null;
  goal_period: 'month' | 'year';
}

export interface ShareLink {
  id: string;
  dashboard_id: string;
  name: string;
  token: string;
  hidden_field_ids: string[];
  views: string[];
  date_from: string | null;
  date_to: string | null;
  password_hash: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  noindex: boolean;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  dashboard_id: string | null;
  project_id: string | null;
  action: string;
  summary: string;
  created_at: string;
}

/** What a public viewer receives: already stripped by the database. */
export interface SharedPayload {
  status: 'ok';
  dashboard: { name: string; description: string | null; icon: string; color: string };
  owner: { name?: string | null; avatar_url?: string | null; username?: string | null };
  link: { name: string; views: string[]; noindex: boolean };
  fields: Pick<Field, 'id' | 'name' | 'type' | 'role' | 'position' | 'options'>[];
  projects: { id: string; data: ProjectData }[];
}
