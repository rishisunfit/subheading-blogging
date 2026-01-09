import { supabase } from "@/lib/supabase";

export interface GenHistoryEntry {
  id: string;
  user_id: string;
  image_url: string;
  prompt: string;
  negative_prompt: string | null;
  aspect_ratio: string;
  model: string;
  created_at: string;
}

export interface CreateGenHistoryData {
  image_url: string;
  prompt: string;
  negative_prompt?: string | null;
  aspect_ratio: string;
  model: string;
}

export const genHistoryApi = {
  async getAll(): Promise<GenHistoryEntry[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("gen_history")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(historyData: CreateGenHistoryData): Promise<GenHistoryEntry> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("gen_history")
      .insert({
        ...historyData,
        user_id: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("gen_history").delete().eq("id", id);
    if (error) throw error;
  },
};
