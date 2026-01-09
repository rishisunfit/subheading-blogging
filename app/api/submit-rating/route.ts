import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionIdFromRequest } from "@/lib/session";

/**
 * API endpoint for submitting ratings/reactions
 * No authentication required - uses session ID from cookies
 *
 * Request body:
 * {
 *   "post_id": "post-id",
 *   "stars": 1-5 (number of stars)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get session ID from cookies
    const cookies = request.headers.get("cookie") || "";
    let sessionId = getSessionIdFromRequest(cookies);

    // If no session ID in cookies, generate one (will be set in response)
    if (!sessionId) {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      sessionId = "";
      for (let i = 0; i < 32; i++) {
        sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    // Get request body
    const body = await request.json();
    const { post_id, stars } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: "post_id is required" },
        { status: 400 }
      );
    }

    if (!stars || typeof stars !== "number" || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: "stars must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    // Save to database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Database configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if this session has already rated this post
    const { data: existingRating } = await supabase
      .from("ratings")
      .select("id, stars")
      .eq("post_id", post_id)
      .eq("session_id", sessionId)
      .single();

    let ratingData;

    if (existingRating) {
      // Update existing rating
      const { data, error } = await supabase
        .from("ratings")
        .update({ stars, updated_at: new Date().toISOString() })
        .eq("id", existingRating.id)
        .select()
        .single();

      if (error) throw error;
      ratingData = data;
    } else {
      // Create new rating
      const { data, error } = await supabase
        .from("ratings")
        .insert({
          post_id,
          session_id: sessionId,
          stars,
        })
        .select()
        .single();

      if (error) throw error;
      ratingData = data;
    }

    // Get updated rating counts for this post
    const { data: ratingCounts } = await supabase
      .from("ratings")
      .select("stars")
      .eq("post_id", post_id);

    // Calculate counts by star rating
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingCounts?.forEach((r) => {
      counts[r.stars] = (counts[r.stars] || 0) + 1;
    });

    // Set session cookie in response if it wasn't in request
    const response = NextResponse.json({
      success: true,
      rating: ratingData,
      counts,
    });

    if (!getSessionIdFromRequest(cookies)) {
      // Set cookie with 1 year expiration
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      response.cookies.set("blogish_session_id", sessionId, {
        expires: expirationDate,
        path: "/",
        sameSite: "lax",
        httpOnly: false, // Allow client-side access
      });
    }

    return response;
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to fetch ratings for a post
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json(
        { error: "post_id is required" },
        { status: 400 }
      );
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

    // Get all ratings for this post
    const { data: ratings, error } = await supabase
      .from("ratings")
      .select("stars")
      .eq("post_id", postId);

    if (error) throw error;

    // Calculate counts by star rating
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings?.forEach((r) => {
      counts[r.stars] = (counts[r.stars] || 0) + 1;
    });

    // Get user's current rating if session exists
    const cookies = request.headers.get("cookie") || "";
    const sessionId = getSessionIdFromRequest(cookies);
    let userRating = null;

    if (sessionId) {
      const { data: userRatingData } = await supabase
        .from("ratings")
        .select("stars")
        .eq("post_id", postId)
        .eq("session_id", sessionId)
        .single();

      if (userRatingData) {
        userRating = userRatingData.stars;
      }
    }

    return NextResponse.json({
      success: true,
      counts,
      userRating,
    });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
