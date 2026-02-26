import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser usage
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
// Alias for backward compatibility if needed (but we use supabaseClient in new code)
export const supabase = supabaseClient;

