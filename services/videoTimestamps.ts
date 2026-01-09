import { supabase } from "@/lib/supabase";

export interface VideoTimestamp {
  id: string;
  video_id: string;
  post_id: string | null;
  timestamp_seconds: number;
  label: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateTimestampData {
  video_id: string;
  post_id?: string | null;
  timestamp_seconds: number;
  label: string;
}

export interface UpdateTimestampData {
  timestamp_seconds?: number;
  label?: string;
}

export const videoTimestampsApi = {
  /**
   * Get all timestamps for a video
   */
  async getByVideoId(videoId: string): Promise<VideoTimestamp[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("video_timestamps")
      .select("*")
      .eq("video_id", videoId)
      .order("timestamp_seconds", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all timestamps for a post
   */
  async getByPostId(postId: string): Promise<VideoTimestamp[]> {
    const { data, error } = await supabase
      .from("video_timestamps")
      .select("*")
      .eq("post_id", postId)
      .order("timestamp_seconds", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Public method to get timestamps for a post (no auth required)
   */
  async getPublicByPostId(postId: string): Promise<VideoTimestamp[]> {
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
      .from("video_timestamps")
      .select("*")
      .eq("post_id", postId)
      .order("timestamp_seconds", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new timestamp
   */
  async create(timestampData: CreateTimestampData): Promise<VideoTimestamp> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("video_timestamps")
      .insert({
        video_id: timestampData.video_id,
        post_id: timestampData.post_id || null,
        timestamp_seconds: timestampData.timestamp_seconds,
        label: timestampData.label,
        user_id: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a timestamp
   */
  async update(
    id: string,
    updateData: UpdateTimestampData
  ): Promise<VideoTimestamp> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("video_timestamps")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a timestamp
   */
  async delete(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("video_timestamps")
      .delete()
      .eq("id", id)
      .eq("user_id", userData.user.id);

    if (error) throw error;
  },

  /**
   * Public method to get timestamps for a video (no auth required)
   */
  async getPublicByVideoId(videoId: string): Promise<VideoTimestamp[]> {
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
      .from("video_timestamps")
      .select("*")
      .eq("video_id", videoId)
      .order("timestamp_seconds", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
