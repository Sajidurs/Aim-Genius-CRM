import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR-PROJECT-REF')) {
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL ' +
      'and VITE_SUPABASE_ANON_KEY from your Supabase project (Project Settings -> API). ' +
      'On Vercel, set the same two variables in Project Settings -> Environment Variables ' +
      'and redeploy.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
