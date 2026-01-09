import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/supabase-server";

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

type CloudflareStreamResponse = {
  success: boolean;
  result?: {
    uid: string;
    thumbnail?: string;
    readyToStream?: boolean;
    cooldown?: number;
  };
  errors?: Array<{ code: number; message: string }>;
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", details: "Missing bearer token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { user, error: authError } = await verifyAuthToken(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", details: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: "No video file provided",
          details: "Attach a File named 'file'",
        },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          details: "Only video files are supported",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "File too large",
          details: `Video size must be less than ${Math.floor(
            MAX_VIDEO_SIZE_BYTES / 1024 / 1024
          )}MB`,
        },
        { status: 400 }
      );
    }

    const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
    const cloudflareCustomerCode =
      process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;

    if (!cloudflareAccountId || !cloudflareApiToken) {
      return NextResponse.json(
        {
          error: "Server misconfiguration",
          details: "Missing Cloudflare credentials",
        },
        { status: 500 }
      );
    }

    if (!cloudflareCustomerCode) {
      return NextResponse.json(
        {
          error: "Server misconfiguration",
          details: "Missing CLOUDFLARE_STREAM_CUSTOMER_CODE",
        },
        { status: 500 }
      );
    }

    const cloudflareFormData = new FormData();
    cloudflareFormData.append("file", file, file.name);
    cloudflareFormData.append(
      "meta",
      JSON.stringify({
        user_id: user.id,
        upload_origin: "editor_modal",
      })
    );

    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream?requireSignedURLs=false`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cloudflareApiToken}`,
        },
        body: cloudflareFormData,
      }
    );

    const uploadResult =
      (await uploadResponse.json()) as CloudflareStreamResponse;

    if (!uploadResponse.ok || !uploadResult.success || !uploadResult.result) {
      console.error("Cloudflare Stream upload failed:", uploadResult);
      return NextResponse.json(
        {
          error: "Cloudflare upload failed",
          details: uploadResult.errors ?? [
            { message: "Unknown error", code: -1 },
          ],
        },
        { status: 502 }
      );
    }

    const videoId = uploadResult.result.uid;
    const readyToStream = uploadResult.result.readyToStream ?? false;

    // Use customer-specific URLs that include the customer code
    const playbackUrl = `https://customer-${cloudflareCustomerCode}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
    const embedUrl = `https://customer-${cloudflareCustomerCode}.cloudflarestream.com/${videoId}/iframe`;

    return NextResponse.json({
      success: true,
      videoId,
      playbackUrl,
      embedUrl,
      thumbnail: uploadResult.result.thumbnail ?? null,
      readyToStream,
      message: readyToStream
        ? "Video uploaded successfully and ready to stream"
        : "Video uploaded successfully but may still be processing. It will be available shortly.",
    });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
