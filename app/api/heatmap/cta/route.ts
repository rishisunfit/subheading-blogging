/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API endpoint for tracking CTA interaction heatmap data
 * No authentication required - uses session ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      post_id,
      session_id,
      cta_id,
      was_seen,
      was_clicked,
      viewport_width,
      viewport_height,
      page_url,
      user_agent,
    } = body;

    if (!post_id || !session_id || !cta_id) {
      return NextResponse.json(
        { error: "post_id, session_id, and cta_id are required" },
        { status: 400 }
      );
    }

    // Validate that page_url matches posts/[id] pattern
    if (page_url) {
      try {
        const url = new URL(page_url);
        const pathname = url.pathname;
        if (!/^\/posts\/[^/]+$/.test(pathname)) {
          return NextResponse.json(
            { error: "Heatmap data can only be collected on posts/[id] pages" },
            { status: 403 }
          );
        }
      } catch {
        // Invalid URL format, but don't block - just log
        console.warn("Invalid page_url format:", page_url);
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Database configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if record exists
    const { data: existing } = await supabase
      .from("post_heatmap_cta")
      .select("*")
      .eq("post_id", post_id)
      .eq("session_id", session_id)
      .eq("cta_id", cta_id)
      .single();

    const updateData: any = {
      post_id,
      session_id,
      cta_id,
      updated_at: new Date().toISOString(),
    };

    if (was_seen && !existing?.was_seen) {
      updateData.was_seen = true;
      updateData.seen_at = new Date().toISOString();
    }

    if (was_clicked && !existing?.was_clicked) {
      updateData.was_clicked = true;
      updateData.clicked_at = new Date().toISOString();
    }

    if (viewport_width) updateData.viewport_width = viewport_width;
    if (viewport_height) updateData.viewport_height = viewport_height;
    if (page_url) updateData.page_url = page_url;
    if (user_agent) updateData.user_agent = user_agent;

    // Upsert CTA data
    const { error } = await supabase
      .from("post_heatmap_cta")
      .upsert(updateData, {
        onConflict: "post_id,session_id,cta_id",
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving CTA data:", error);
    return NextResponse.json(
      { error: "Failed to save CTA data" },
      { status: 500 }
    );
  }
}
