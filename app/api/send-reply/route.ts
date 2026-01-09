import { NextRequest, NextResponse } from "next/server";
import { sendTwilioSMS, sendTwilioEmail } from "@/lib/twilioUtils";
import { verifyAuthToken } from "@/lib/supabase-server";

/**
 * API endpoint for sending replies to form submissions
 * Requires authentication - only post authors can reply
 *
 * Request body:
 * {
 *   "submission_id": "submission-id",
 *   "email": "user@example.com" (optional),
 *   "phone": "+1234567890" (optional),
 *   "message": "Reply message"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          details:
            "Missing or invalid authorization token. Please log in to send a reply.",
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { user, error: authError } = await verifyAuthToken(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Invalid or expired token. Please log in again.",
        },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { submission_id, email, phone, message } = body;

    if (!submission_id) {
      return NextResponse.json(
        { error: "submission_id is required" },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!email?.trim() && !phone?.trim()) {
      return NextResponse.json(
        { error: "Either email or phone is required to send a reply" },
        { status: 400 }
      );
    }

    // Verify the submission belongs to a post authored by the current user
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Database configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the submission and verify ownership
    const { data: submission, error: submissionError } = await supabase
      .from("form_submissions")
      .select("id, post_author_id")
      .eq("id", submission_id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify the current user is the post author
    if (submission.post_author_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - You can only reply to submissions for your own posts",
        },
        { status: 403 }
      );
    }

    // Send reply via SMS if phone is provided
    if (phone?.trim()) {
      const smsMessage = `Reply from blog author:\n\n${message.trim()}`;
      const smsSent = await sendTwilioSMS(phone.trim(), smsMessage);

      if (!smsSent) {
        return NextResponse.json(
          { error: "Failed to send SMS reply" },
          { status: 500 }
        );
      }

      console.log(`✅ SMS reply sent to ${phone.trim()}`);
    }

    // Send reply via email if email is provided
    if (email?.trim()) {
      const emailSubject = "Reply from blog author";
      const emailBody = message.trim();
      const emailSent = await sendTwilioEmail(
        email.trim(),
        emailSubject,
        emailBody
      );

      if (!emailSent) {
        return NextResponse.json(
          { error: "Failed to send email reply" },
          { status: 500 }
        );
      }

      console.log(`✅ Email reply sent to ${email.trim()}`);
    }

    return NextResponse.json({
      success: true,
      message: "Reply sent successfully",
      data: {
        submission_id,
        sent_via: phone ? "SMS" : "Email",
      },
    });
  } catch (error) {
    console.error("Error sending reply:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
