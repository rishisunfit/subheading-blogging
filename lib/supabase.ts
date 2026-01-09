import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Gets Supabase client with lazy initialization
 * This prevents errors during build time when env vars might not be available
 */
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env file."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Use a getter function to lazy-initialize the client
let _supabaseClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_supabaseClient) {
    _supabaseClient = getSupabaseClient();
  }
  return _supabaseClient;
}

// Create a proxy that lazy-loads the client on first access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop as keyof SupabaseClient];
    // If it's a function, bind it to the client to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
