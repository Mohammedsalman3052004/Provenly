import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv, serviceRoleKey } from '@/lib/env';

/** Service-role client. SERVER ONLY. Used exclusively for account deletion. */
export function createAdminClient() {
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
