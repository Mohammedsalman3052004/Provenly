import { createClient as createSbClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

/** Cookie-less anonymous client. Only used for the public RPCs (share links, public profiles). */
export function createPublicClient() {
  const env = publicEnv();
  return createSbClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
