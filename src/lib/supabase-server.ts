import { createClient } from '@supabase/supabase-js';

let _client: any = null;

function getClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (url) {
      _client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }
  return _client;
}

export const supabaseServer = {
  from: (...args: any[]) => getClient()?.from(...args),
};
