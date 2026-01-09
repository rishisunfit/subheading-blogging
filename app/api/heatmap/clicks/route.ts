/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API endpoint for tracking click heatmap data
 * No authentication required - uses session ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post_id, session_id, clicks } = body;

    if (!post_id || !session_id || !Array.isArray(clicks)) {
      return NextResponse.json(
        { error: "post_id, session_id, and clicks array are required" },
        { status: 400 }
      );
    }

    // Validate that all clicks are from posts/[id] pages
    for (const click of clicks) {
      if (click.page_url) {
        try {
          const url = new URL(click.page_url);
          const pathname = url.pathname;
          if (!/^\/posts\/[^/]+$/.test(pathname)) {
            return NextResponse.json(
              {
                error: "Heatmap data can only be collected on posts/[id] pages",
              },
              { status: 403 }
            );
          }
        } catch {
          // Invalid URL format, but don't block - just log
          console.warn("Invalid page_url format:", click.page_url);
        }
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

    // Insert all clicks
    const { error } = await supabase.from("post_heatmap_clicks").insert(
      clicks.map((click: any) => ({
        post_id,
        session_id,
        x_percent: click.x_percent,
        y_percent: click.y_percent,
        content_x: click.content_x ?? null,
        content_y: click.content_y ?? null,
        scroll_y: click.scroll_y ?? 0,
        content_container_selector:
          click.content_container_selector ?? "article",
        element_tag: click.element_tag,
        element_class: click.element_class,
        element_id: click.element_id,
        heatmap_id: click.heatmap_id,
        is_dead_click: click.is_dead_click || false,
        viewport_width: click.viewport_width,
        viewport_height: click.viewport_height,
        page_url: click.page_url,
        user_agent: click.user_agent,
      }))
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving click data:", error);
    return NextResponse.json(
      { error: "Failed to save click data" },
      { status: 500 }
    );
  }
}
