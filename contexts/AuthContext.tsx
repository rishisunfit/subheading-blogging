import { useEffect, useState, useCallback, createContext } from "react";
import type { ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    phone?: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(
    async (
      userId: string,
      currentUser?: User | null,
      currentSession?: Session | null
    ) => {
      const userEmail = currentUser?.email || currentSession?.user?.email || "";

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, phone")
          .eq("id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "not found" - we'll handle that
          console.error("Error loading profile:", error);
        }

        if (data) {
          setProfile({
            id: userId,
            email: userEmail,
            name: data.name,
            phone: data.phone,
          });
        } else {
          // Profile doesn't exist yet, create it
          setProfile({
            id: userId,
            email: userEmail,
            name: null,
            phone: null,
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        // Set a basic profile even if query fails
        setProfile({
          id: userId,
          email: userEmail,
          name: null,
          phone: null,
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Set a timeout to ensure loading doesn't hang forever
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn("Auth initialization timeout - forcing loading to false");
        setLoading(false);
      }
    }, 2000); // Reduced to 2 seconds

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (timeoutId) clearTimeout(timeoutId);

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Don't await - let it run in background, timeout will handle if it hangs
          loadUserProfile(session.user.id, session.user, session).catch(
            (err) => {
              console.error("Profile load error:", err);
              if (mounted) setLoading(false);
            }
          );
        } else {
          setProfile(null);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error getting session:", error);
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId);
          setLoading(false);
        }
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (timeoutId) clearTimeout(timeoutId);

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Don't await - let it run in background
        loadUserProfile(session.user.id, session.user, session).catch((err) => {
          console.error("Profile load error:", err);
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone || null,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      // Create profile in users table
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        name,
        phone: phone || null,
      });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Don't throw - auth user is created, profile can be updated later
      }

      // If session is not automatically created, the database trigger will auto-confirm
      // Wait a moment for the trigger to process, then sign in automatically
      if (!data.session) {
        // Wait for the database trigger to auto-confirm the email
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Sign in automatically after email is confirmed by trigger
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw new Error(
            "Account created but could not sign in automatically. Please try signing in manually."
          );
        }
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
