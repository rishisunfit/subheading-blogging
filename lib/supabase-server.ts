import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Gets Supabase environment variables with validation
 * Throws error only when actually used (at runtime), not during build
 */
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env file."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Creates a Supabase client for server-side use with a specific JWT token
 */
export function createServerClient(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Verifies a JWT token and returns the user
 */
export async function verifyAuthToken(
  token: string
): Promise<{ user: User | null; error: Error | null }> {
  try {
    const client = createServerClient(token);
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error) {
      return { user: null, error };
    }

    return { user, error: null };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}
