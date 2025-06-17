import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("Supabase URL is not defined. Please check your .env file for NEXT_PUBLIC_SUPABASE_URL.");
}
if (!supabaseAnonKey) {
  console.error("Supabase Anon Key is not defined. Please check your .env file for NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

// Ensure that we only attempt to create a client if both URL and key are present.
// This helps prevent errors during build or runtime if .env is misconfigured.
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Provide a mock client or throw an error if critical, 
  // depending on how you want to handle misconfiguration.
  // For now, we'll log the error and proceed, which might lead to runtime errors if Supabase is used.
  console.warn("Supabase client could not be initialized due to missing URL or Anon Key.");
  // Fallback to a mock or null client if necessary, or ensure your app handles this gracefully.
  // supabase = {} as SupabaseClient; // Example: mock client to prevent crashes, but operations will fail.
}

export { supabase };
