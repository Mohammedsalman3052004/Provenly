import { z } from 'zod';
import { FIELD_ROLES, FIELD_TYPES } from '@/types';

export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const uuidSchema = z.string().uuid();
export const currencySchema = z.string().regex(/^[A-Z]{3}$/);

export const choiceSchema = z.object({ value: z.string().trim().min(1).max(40), color: colorSchema, done: z.boolean().optional() });
export const fieldOptionsSchema = z.object({
  currency: currencySchema.optional(),
  choices: z.array(choiceSchema).max(30).optional(),
  formula: z.object({ op: z.enum(['subtract', 'add', 'multiply']), a: uuidSchema, b: uuidSchema }).optional(),
});

export const fieldInputSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(60),
  type: z.enum(FIELD_TYPES),
  role: z.enum(FIELD_ROLES).nullable(),
  required: z.boolean(),
  sensitive: z.boolean(),
  default_visible: z.boolean(),
  options: fieldOptionsSchema,
});
export const fieldsSaveSchema = z.array(fieldInputSchema).min(1).max(60);

export const dashboardInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().default(''),
  icon: z.string().trim().min(1).max(8).default('◆'),
  color: colorSchema.default('#3781fc'),
});

export const createDashboardSchema = dashboardInputSchema.extend({
  template: z.enum(['freelancing', 'agency', 'design', 'opensource', 'blank']),
  currency: currencySchema.default('INR'),
  fieldKeys: z.array(z.string().max(40)).max(60).optional(),
  sample: z.boolean().default(false),
});

export const shareLinkSchema = z.object({
  name: z.string().trim().min(1).max(60),
  hidden_field_ids: z.array(uuidSchema).max(60),
  views: z.array(z.enum(['table', 'gallery', 'analytics'])).min(1),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  expires_at: z.string().nullable(),
  noindex: z.boolean(),
  password: z.string().max(100).optional(),
});

export const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,30}$/, '3-30 chars: a-z, 0-9, _ or -').or(z.literal('')),
  bio: z.string().trim().max(280),
  base_currency: currencySchema,
  is_public: z.boolean(),
  goal_type: z.enum(['revenue', 'projects']).nullable(),
  goal_value: z.number().int().positive().nullable(),
  goal_period: z.enum(['month', 'year']),
});
