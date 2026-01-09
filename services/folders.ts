import { supabase } from "@/lib/supabase";
import type { TablesUpdate } from "@/types/database";

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderData {
  name: string;
  slug: string;
}

export interface UpdateFolderData {
  name?: string;
  slug?: string;
}

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export const foldersApi = {
  async getAll(): Promise<Folder[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Folder> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error("Folder not found");
    }
    return data;
  },

  async create(folderData: CreateFolderData): Promise<Folder> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("folders")
      .insert({
        name: folderData.name,
        slug: folderData.slug,
        user_id: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, folderData: UpdateFolderData): Promise<Folder> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const updateData: TablesUpdate<"folders"> = {};
    if (folderData.name !== undefined) updateData.name = folderData.name;
    if (folderData.slug !== undefined) updateData.slug = folderData.slug;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("folders")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error("Folder not found");
    }
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", id)
      .eq("user_id", userData.user.id);

    if (error) throw error;
  },
};
