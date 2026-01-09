import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { verifyAuthToken } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  console.log("API handler called, method: POST");

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid authorization token." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const { user, error: authError } = await verifyAuthToken(token);

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { error: "Unauthorized. Invalid or expired token." },
        { status: 401 }
      );
    }

    console.log(`Authenticated user: ${user.id} (${user.email})`);

    // Get Google API key
    const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Google AI API key is not configured. Please set GOOGLE_AI_API_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    console.log("Starting image generation...");

    // Parse multipart form data using Next.js native FormData API
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseError) {
      console.error("Error parsing form data:", parseError);
      return NextResponse.json(
        {
          error:
            "Failed to parse form data. Please ensure all fields are properly formatted.",
        },
        { status: 400 }
      );
    }

    const text = (formData.get("text") as string) || "";
    const negativePrompt = (formData.get("negativePrompt") as string) || "";
    const aspectRatio = (formData.get("aspectRatio") as string) || "1:1";
    const numberOfImages = parseInt(
      (formData.get("numberOfImages") as string) || "1"
    );
    const model = (formData.get("model") as string) || "gemini-2.5-flash-image";
    const imageFile = formData.get("image") as File | null;

    if (!text) {
      return NextResponse.json(
        { error: "Text description is required" },
        { status: 400 }
      );
    }

    // Convert image file to base64 if provided
    let originalBase64Image: string | null = null;
    let croppedBase64Image: string | null = null;
    let mimeType: string = "image/jpeg";

    if (imageFile) {
      try {
        // Convert File to ArrayBuffer, then to Buffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const metadata = await sharp(buffer).metadata();
        const originalWidth = metadata.width || 1024;
        const originalHeight = metadata.height || 1024;

        // Calculate target dimensions based on aspect ratio
        const [ratioW, ratioH] = aspectRatio.split(":").map(Number);
        const targetRatio = ratioW / ratioH;
        const currentRatio = originalWidth / originalHeight;

        // Prepare original image (resize if too large)
        const maxDimension = 1024;
        let originalBuffer: Buffer;
        if (originalWidth > maxDimension || originalHeight > maxDimension) {
          originalBuffer = await sharp(buffer)
            .resize(maxDimension, maxDimension, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .toBuffer();
        } else {
          originalBuffer = buffer;
        }
        originalBase64Image = originalBuffer.toString("base64");

        // Create cropped version with target aspect ratio
        if (Math.abs(currentRatio - targetRatio) < 0.01) {
          croppedBase64Image = originalBase64Image;
        } else {
          let targetWidth: number;
          let targetHeight: number;

          if (currentRatio > targetRatio) {
            targetHeight = Math.min(originalHeight, maxDimension);
            targetWidth = Math.round(targetHeight * targetRatio);
          } else {
            targetWidth = Math.min(originalWidth, maxDimension);
            targetHeight = Math.round(targetWidth / targetRatio);
          }

          const croppedBuffer = await sharp(buffer)
            .resize(targetWidth, targetHeight, {
              fit: "cover",
              position: "center",
            })
            .toBuffer();

          croppedBase64Image = croppedBuffer.toString("base64");
        }

        mimeType = imageFile.type || "image/jpeg";
      } catch (error) {
        console.error("Error processing image:", error);
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        originalBase64Image = buffer.toString("base64");
        croppedBase64Image = originalBase64Image;
        mimeType = imageFile.type || "image/jpeg";
      }
    } else {
      // Create placeholder image with correct aspect ratio
      try {
        const [ratioW, ratioH] = aspectRatio.split(":").map(Number);
        const baseSize = 512;
        let width: number;
        let height: number;

        if (ratioW >= ratioH) {
          width = baseSize;
          height = Math.round((baseSize * ratioH) / ratioW);
        } else {
          height = baseSize;
          width = Math.round((baseSize * ratioW) / ratioH);
        }

        const placeholderBuffer = await sharp({
          create: {
            width: Math.round(width),
            height: Math.round(height),
            channels: 4,
            background: { r: 30, g: 30, b: 30, alpha: 0.3 },
          },
        })
          .png()
          .toBuffer();

        croppedBase64Image = placeholderBuffer.toString("base64");
        mimeType = "image/png";
      } catch (error) {
        console.error("Error creating placeholder image:", error);
      }
    }

    // Build prompt
    let finalPrompt = text;

    if (aspectRatio) {
      const ratioDescriptions: Record<string, string> = {
        "1:1": "square (1:1 aspect ratio, equal width and height)",
        "4:5": "portrait (4:5 aspect ratio, vertical, taller than wide)",
        "2:3": "portrait (2:3 aspect ratio, vertical, taller than wide)",
        "16:9":
          "landscape (16:9 aspect ratio, wide horizontal, much wider than tall)",
        "9:16":
          "portrait (9:16 aspect ratio, tall vertical, much taller than wide)",
      };
      const ratioDesc =
        ratioDescriptions[aspectRatio] || `${aspectRatio} aspect ratio`;
      finalPrompt = `ABSOLUTELY CRITICAL: The output image MUST be exactly ${ratioDesc} with aspect ratio ${aspectRatio}. ${finalPrompt}. The final image dimensions MUST match ${aspectRatio} aspect ratio precisely - width:height = ${aspectRatio}. NEVER generate a square (1:1) image unless the requested aspect ratio is 1:1. The aspect ratio ${aspectRatio} is MANDATORY and NON-NEGOTIABLE.`;
    }

    if (negativePrompt) {
      finalPrompt = `${finalPrompt}. Do not include: ${negativePrompt}`;
    }

    if (
      imageFile &&
      originalBase64Image &&
      croppedBase64Image &&
      originalBase64Image !== croppedBase64Image
    ) {
      finalPrompt = `${finalPrompt}. CRITICAL: Use the FIRST image for content reference (it contains the full original content). Use the SECOND image ONLY as a reference for the output aspect ratio (${aspectRatio}). The output image MUST match the second image's aspect ratio exactly while using content from the first image.`;
    } else if (imageFile && aspectRatio) {
      finalPrompt = `${finalPrompt}. CRITICAL: The output image MUST have exactly ${aspectRatio} aspect ratio. Match the aspect ratio precisely.`;
    } else if (!imageFile && croppedBase64Image && aspectRatio) {
      finalPrompt = `${finalPrompt}. ABSOLUTELY CRITICAL: The provided reference image shows the EXACT aspect ratio (${aspectRatio}) that the output MUST match. The output image MUST have the same width-to-height ratio as the reference image. The reference image has aspect ratio ${aspectRatio} - your output MUST match this exactly. NEVER default to square (1:1) - the aspect ratio ${aspectRatio} is MANDATORY.`;
    }

    // Generate images
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`;
    const requestsToMake = Math.min(numberOfImages, 4);
    const imageUrls: string[] = [];

    console.log(`Making ${requestsToMake} request(s) to Google AI API...`);

    for (let i = 0; i < requestsToMake; i++) {
      console.log(`Generating image ${i + 1}/${requestsToMake}...`);
      try {
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const requestParts: Array<{
          text?: string;
          inlineData?: { mimeType: string; data: string };
        }> = [{ text: finalPrompt }];

        if (
          originalBase64Image &&
          croppedBase64Image &&
          originalBase64Image !== croppedBase64Image
        ) {
          requestParts.push({
            inlineData: {
              mimeType: mimeType,
              data: originalBase64Image,
            },
          });
          requestParts.push({
            inlineData: {
              mimeType: mimeType,
              data: croppedBase64Image,
            },
          });
        } else if (croppedBase64Image) {
          requestParts.push({
            inlineData: {
              mimeType: mimeType,
              data: croppedBase64Image,
            },
          });
        }

        const requestBody = {
          contents: [
            {
              parts: requestParts,
            },
          ],
        };

        console.log(`Calling Google AI API for image ${i + 1}...`);
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`Google AI API response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          const errorMessage =
            errorData.error?.message ||
            errorData.error ||
            `API returned ${response.status}`;

          if (i === 0) {
            throw new Error(errorMessage);
          } else {
            console.error(`Error generating image ${i + 1}:`, errorData);
            break;
          }
        }

        const data = await response.json();

        if (
          !data.candidates ||
          !data.candidates[0] ||
          !data.candidates[0].content
        ) {
          if (i === 0) {
            throw new Error(
              "No image returned from API. Check API response format."
            );
          } else {
            console.error(`Unexpected response format for image ${i + 1}`);
            break;
          }
        }

        const responseParts = data.candidates[0].content.parts;
        let imageBase64: string | null = null;
        let imageMimeType: string = "image/png";

        for (const part of responseParts) {
          if (part.inlineData) {
            imageBase64 = part.inlineData.data;
            imageMimeType = part.inlineData.mimeType || "image/png";
            break;
          }
        }

        if (imageBase64) {
          const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;
          imageUrls.push(imageDataUrl);
        } else {
          if (i === 0) {
            throw new Error("Image data not found in API response");
          } else {
            console.error(`No image data for image ${i + 1}`);
            break;
          }
        }
      } catch (err) {
        if (i === 0) {
          throw err;
        } else {
          console.error(`Error generating image ${i + 1}:`, err);
          break;
        }
      }
    }

    if (imageUrls.length === 0) {
      throw new Error("No images were generated. Please try again.");
    }

    console.log(`Successfully generated ${imageUrls.length} image(s)`);
    return NextResponse.json({
      imageUrls: imageUrls,
      imageUrl: imageUrls[0],
    });
  } catch (error) {
    console.error("Error generating image:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate image";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
