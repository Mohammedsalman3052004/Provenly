import { computeAll, normalize, type AnalyticsResult, type Period } from '@/features/analytics/compute';
import type { SharedPayload } from '@/types';

export interface SharedViewModel {
  payload: SharedPayload;
  analytics: Record<Period, AnalyticsResult>;
}

/** Runs on the server over the ALREADY-STRIPPED payload, so hidden numbers cannot reach any chart. */
export function buildViewModel(payload: SharedPayload): SharedViewModel {
  const { items, flags, currency } = normalize(payload.fields, payload.projects);
  return { payload, analytics: computeAll(items, flags, currency) };
}
