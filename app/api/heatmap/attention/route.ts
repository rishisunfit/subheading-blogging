import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API endpoint for tracking attention by section heatmap data
 * No authentication required - uses session ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      post_id,
      session_id,
      section_id,
      time_visible_ms,
      view_count,
      viewport_width,
      viewport_height,
      page_url,
      user_agent,
    } = body;

    if (!post_id || !session_id || !section_id) {
      return NextResponse.json(
        { error: "post_id, session_id, and section_id are required" },
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

    // Upsert attention data (update if exists, insert if not)
    const { error } = await supabase.from("post_heatmap_attention").upsert(
      {
        post_id,
        session_id,
        section_id,
        time_visible_ms,
        view_count: view_count || 1,
        viewport_width,
        viewport_height,
        page_url,
        user_agent,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "post_id,session_id,section_id",
      }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving attention data:", error);
    return NextResponse.json(
      { error: "Failed to save attention data" },
      { status: 500 }
    );
  }
}
