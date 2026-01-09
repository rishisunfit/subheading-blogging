import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API endpoint for tracking rage click / dead click data
 * No authentication required - uses session ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      post_id,
      session_id,
      x_percent,
      y_percent,
      click_count,
      time_window_ms,
      element_tag,
      element_class,
      element_id,
      heatmap_id,
      viewport_width,
      viewport_height,
      page_url,
      user_agent,
    } = body;

    if (!post_id || !session_id) {
      return NextResponse.json(
        { error: "post_id and session_id are required" },
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

    // Insert rage click data
    const { error } = await supabase.from("post_heatmap_rage_clicks").insert({
      post_id,
      session_id,
      x_percent,
      y_percent,
      click_count,
      time_window_ms,
      element_tag,
      element_class,
      element_id,
      heatmap_id,
      viewport_width,
      viewport_height,
      page_url,
      user_agent,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving rage click data:", error);
    return NextResponse.json(
      { error: "Failed to save rage click data" },
      { status: 500 }
    );
  }
}
