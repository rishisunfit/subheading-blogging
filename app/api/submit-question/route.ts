import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTwilioSMS } from "@/lib/twilioUtils";
import { getSessionIdFromRequest } from "@/lib/session";

/**
 * API endpoint for submitting questions from the preview page
 * No authentication required - uses session ID from cookies
 * Sends SMS notification when user submits a question via the "Have a question? Text me" form
 *
 * Request body:
 * {
 *   "email": "user@example.com" (optional),
 *   "phone": "+1234567890" (optional),
 *   "message": "User's question message",
 *   "post_id": "optional-post-id"
 * }
 * Note: At least one of email or phone must be provided
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
    const { email, phone, message, post_id } = body;

    // Validate that at least one contact method is provided
    if (!email?.trim() && !phone?.trim()) {
      return NextResponse.json(
        { error: "At least one contact method (email or phone) is required" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    console.log("=== QUESTION SUBMISSION ===");
    console.log("Email:", email || "N/A");
    console.log("Phone number:", phone || "N/A");
    console.log("Message:", message);
    console.log("Post ID:", post_id || "N/A");
    console.log("Session ID:", sessionId);

    // Save the submission to database (optional - continue even if this fails)
    let submissionData = null;
    let submissionError = null;
    // Keep original post_id for SMS (even if not in Supabase)
    const originalPostId = post_id || null;
    let dbPostId: string | null = null;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Check if post exists in Supabase and get post author's user_id
        let postAuthorId: string | null = null;
        if (originalPostId) {
          const { data: postData, error: postError } = await supabase
            .from("posts")
            .select("id, user_id")
            .eq("id", originalPostId)
            .single();

          if (postError || !postData) {
            console.warn(
              `Post ID ${originalPostId} not found in Supabase posts table. Saving submission without post_id to avoid FK constraint error.`
            );
            dbPostId = null; // Set to null to avoid FK constraint error
          } else {
            dbPostId = originalPostId; // Post exists, use it
            postAuthorId = postData.user_id; // Get the post author's user_id
            console.log("Post Author User ID:", postAuthorId || "N/A");
          }
        }

        // Insert the submission with post_id (if exists in Supabase), session_id, and post author's user_id
        const result = await supabase
          .from("form_submissions")
          .insert({
            email: email?.trim() || null,
            phone: phone?.trim() || null,
            subject: "Question from preview page",
            message: message,
            post_id: dbPostId,
            session_id: sessionId, // Anonymous session ID
            post_author_id: postAuthorId, // Post author's user_id
          })
          .select()
          .single();

        if (result.error) {
          console.error("❌ Database insert error:", result.error);
          console.error("Error details:", {
            message: result.error.message,
            code: result.error.code,
            details: result.error.details,
            hint: result.error.hint,
          });
          submissionError = result.error;
        } else {
          submissionData = result.data;
          console.log("✅ Submission saved to database:", submissionData.id);
        }
      } else {
        console.error(
          "❌ Supabase configuration missing - cannot save to database"
        );
      }
    } catch (error) {
      console.error("❌ Exception while saving submission to database:", error);
      submissionError =
        error instanceof Error ? error : new Error(String(error));
      // Continue with SMS even if database save fails
    }

    if (submissionError) {
      console.error(
        "❌ Final error state - submission NOT saved:",
        submissionError
      );
      // Log full error for debugging
      if (submissionError instanceof Error) {
        console.error("Error message:", submissionError.message);
        console.error("Error stack:", submissionError.stack);
      }
      // Continue with SMS even if database save fails, but log the error clearly
    }

    // Get Twilio phone number from env
    const twilioToPhoneNumber = process.env.TWILIO_TO_PHONE_NUMBER;

    if (!twilioToPhoneNumber) {
      console.error("❌ SMS NOT SENT - TWILIO_TO_PHONE_NUMBER not configured");
      return NextResponse.json(
        {
          error: "SMS configuration missing",
          message: "TWILIO_TO_PHONE_NUMBER environment variable not set",
        },
        { status: 500 }
      );
    }

    // Format SMS message with question details
    // Use originalPostId for SMS (even if not saved to DB due to FK constraint)
    const contactInfo = [];
    if (email?.trim()) contactInfo.push(`Email: ${email.trim()}`);
    if (phone?.trim()) contactInfo.push(`Phone: ${phone.trim()}`);

    const smsMessage = `New Question from Blog Post!\n\n${contactInfo.join(
      "\n"
    )}\nMessage: ${message}\n${
      originalPostId ? `Post ID: ${originalPostId}\n` : ""
    }Session ID: ${sessionId}\n\nUser wants to get in touch.`;

    // Send SMS notification
    const smsSent = await sendTwilioSMS(twilioToPhoneNumber, smsMessage);

    if (!smsSent) {
      console.error("Failed to send SMS notification");
      return NextResponse.json(
        { error: "Failed to send SMS notification" },
        { status: 500 }
      );
    }

    console.log("✅ Question submission processed successfully");

    // Set session cookie in response if it wasn't in request
    const response = NextResponse.json({
      success: true,
      message: "Question submitted successfully",
      data: {
        submission_id: submissionData?.id || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        message: message,
        post_id: originalPostId, // Return original post_id (even if not saved to DB)
      },
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
    console.error("Error processing question submission:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
