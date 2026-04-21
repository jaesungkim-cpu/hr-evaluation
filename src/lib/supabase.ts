import { createClient } from '@supabase/supabase-js';

let _client: any = null;

function getClient() {
    if (!_client) {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          if (url && key) {
                  _client = createClient(url, key);
          }
    }
    return _client;
}

export const supabase = {
    from: (...args: any[]) => getClient()?.from(...args),
};
