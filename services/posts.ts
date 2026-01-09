import { supabase } from "@/lib/supabase";
import type { PostTemplateData } from "@/services/postTemplate";
import type { TablesUpdate, Json } from "@/types/database";

export interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  status: "draft" | "published";
  user_id: string;
  is_draft: boolean;
  quiz_id: string | null;
  rating_enabled?: boolean;
  cta_enabled?: boolean;
  component_order?: string[];
  styles?: PostStyles;
  template_data?: PostTemplateData | null;
  folder_id?: string | null;
  folder_slug?: string | null;
  post_slug?: string | null;
  next_post_id?: string | null;
  quiz_show_responses_preview?: boolean;
  quiz_skip_contact_collection?: boolean;
  quiz_show_description?: boolean;
  quiz_show_responses_button?: boolean;
}

export interface PostStyles {
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
  primaryTextColor: string;
  secondaryColor: string;
  linkColor: string;
  headingFont: string;
  headingWeight: string;
  bodyFont: string;
  bodyWeight: string;
}

export interface CreatePostData {
  title: string;
  content: string;
  status: "draft" | "published";
  quiz_id?: string | null;
  styles?: PostStyles;
  template_data?: PostTemplateData | null;
  folder_id?: string | null;
  post_slug?: string | null;
  next_post_id?: string | null;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  status?: "draft" | "published";
  is_draft?: boolean;
  quiz_id?: string | null;
  rating_enabled?: boolean;
  cta_enabled?: boolean;
  component_order?: string[];
  styles?: PostStyles;
  template_data?: PostTemplateData | null;
  folder_id?: string | null;
  post_slug?: string | null;
  next_post_id?: string | null;
  quiz_show_responses_preview?: boolean;
  quiz_skip_contact_collection?: boolean;
  quiz_show_description?: boolean;
  quiz_show_responses_button?: boolean;
}

export const postsApi = {
  async getAll(): Promise<Post[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Post> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error("Post not found");
    }
    return data;
  },

  async create(postData: CreatePostData): Promise<Post> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        title: postData.title,
        content: postData.content,
        status: postData.status,
        is_draft: postData.status === "draft",
        user_id: userData.user.id,
        quiz_id: postData.quiz_id || null,
        styles: postData.styles || null,
        template_data: postData.template_data ?? null,
        folder_id: postData.folder_id || null,
        post_slug: postData.post_slug || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, postData: UpdatePostData): Promise<Post> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    // Build update object
    const updateData: TablesUpdate<"posts"> = {};
    if (postData.title !== undefined) updateData.title = postData.title;
    if (postData.content !== undefined) updateData.content = postData.content;
    if (postData.status !== undefined) updateData.status = postData.status;
    if (postData.is_draft !== undefined) {
      updateData.is_draft = postData.is_draft;
    } else if (postData.status !== undefined) {
      updateData.is_draft = postData.status === "draft";
    }
    if (postData.quiz_id !== undefined) updateData.quiz_id = postData.quiz_id;
    if (postData.rating_enabled !== undefined)
      updateData.rating_enabled = postData.rating_enabled;
    if (postData.cta_enabled !== undefined)
      updateData.cta_enabled = postData.cta_enabled;
    if (postData.component_order !== undefined)
      updateData.component_order = postData.component_order;
    if (postData.styles !== undefined)
      updateData.styles = postData.styles as unknown as Json;
    if (postData.template_data !== undefined)
      updateData.template_data =
        postData.template_data as unknown as Json | null;
    if (postData.folder_id !== undefined)
      updateData.folder_id = postData.folder_id;
    if (postData.post_slug !== undefined)
      updateData.post_slug = postData.post_slug;
    if (postData.next_post_id !== undefined)
      updateData.next_post_id = postData.next_post_id;
    if (postData.quiz_show_responses_preview !== undefined)
      updateData.quiz_show_responses_preview =
        postData.quiz_show_responses_preview;
    if (postData.quiz_skip_contact_collection !== undefined)
      updateData.quiz_skip_contact_collection =
        postData.quiz_skip_contact_collection;
    if (postData.quiz_show_description !== undefined)
      updateData.quiz_show_description = postData.quiz_show_description;
    if (postData.quiz_show_responses_button !== undefined)
      updateData.quiz_show_responses_button =
        postData.quiz_show_responses_button;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error("Post not found");
    }
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .eq("user_id", userData.user.id);

    if (error) throw error;
  },

  /**
   * Public method to get a post by ID (no authentication required)
   * Returns posts regardless of status (published or draft)
   * Uses the anon key client which respects RLS policies
   */
  async getPublicById(id: string): Promise<Post> {
    // Create a new client instance without auth to ensure we're using anon key
    // This is important for RLS policies that allow anonymous access
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await publicClient
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      // Provide more helpful error messages
      if (error.code === "PGRST116") {
        throw new Error("Post not found");
      }
      if (
        error.message?.includes("permission denied") ||
        error.message?.includes("row-level security")
      ) {
        throw new Error(
          "Access denied. Please check RLS policies allow public read access to posts."
        );
      }
      throw error;
    }

    if (!data) {
      throw new Error("Post not found");
    }
    return data;
  },

  /**
   * Public method to get a published post by canonical URL (folder_slug + post_slug)
   * Only returns posts with status='published' and is_draft=false
   * Uses the anon key client which respects RLS policies
   */
  async getPublicByCanonical(
    folderSlug: string,
    postSlug: string
  ): Promise<Post> {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await publicClient
      .from("posts")
      .select("*")
      .eq("folder_slug", folderSlug)
      .eq("post_slug", postSlug)
      .eq("status", "published")
      .eq("is_draft", false)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      // Provide more helpful error messages
      if (error.code === "PGRST116") {
        throw new Error("Post not found or not published");
      }
      if (
        error.message?.includes("permission denied") ||
        error.message?.includes("row-level security")
      ) {
        throw new Error(
          "Access denied. Please check RLS policies allow public read access to published posts."
        );
      }
      throw error;
    }

    if (!data) {
      throw new Error("Post not found or not published");
    }
    return data;
  },
};
