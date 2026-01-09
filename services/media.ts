import { supabase } from "@/lib/supabase";

export type MediaType = "image" | "gif" | "video";
export type MediaSource = "upload" | "ai_generated" | "web" | null;

export interface MediaEntry {
  id: string;
  user_id: string;
  type: MediaType;
  url: string;
  source: MediaSource;
  metadata: {
    prompt?: string | null;
    negative_prompt?: string | null;
    aspect_ratio?: string | null;
    model?: string | null;
    source_url?: string | null;
    source_name?: string | null;
    filename?: string | null;
    year?: string | null;
    license_note?: string | null;
  } | null;
  created_at: string;
}

export interface CreateMediaData {
  type: MediaType;
  url: string;
  source?: MediaSource;
  metadata?: {
    prompt?: string | null;
    negative_prompt?: string | null;
    aspect_ratio?: string | null;
    model?: string | null;
    source_url?: string | null;
    source_name?: string | null;
    filename?: string | null;
    year?: string | null;
    license_note?: string | null;
  } | null;
}

export const mediaApi = {
  async getAll(type?: MediaType): Promise<MediaEntry[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    let query = supabase
      .from("media")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<MediaEntry> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("media")
      .select("*")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error("Media not found");
    }
    return data;
  },

  async create(mediaData: CreateMediaData): Promise<MediaEntry> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("media")
      .insert({
        ...mediaData,
        user_id: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("media")
      .delete()
      .eq("id", id)
      .eq("user_id", userData.user.id);

    if (error) throw error;
  },
};
