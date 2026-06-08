/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// URL provided by the user, stripped of /rest/v1/ as expected by the Supabase client
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cttqpqgimmaeoicvvfeb.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wXbWvNsnvvTrhSq38jItZQ_yb8FnZn4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
