import { supabase } from "./supabase";

/**
 * Upload an image file to Supabase storage
 * @param file - The image file to upload
 * @param userId - The user ID (for organizing files)
 * @returns The URL of the uploaded image
 *
 * NOTE: For best results, make your Supabase storage bucket "public" in the Supabase dashboard.
 * Go to Storage > images bucket > Settings > Make it public.
 * This allows images to be accessed via public URLs that never expire.
 *
 * If the bucket is private, this function will use signed URLs (which expire after 1 year).
 */
export async function uploadImageToStorage(
  file: File,
  userId: string
): Promise<string> {
  // Generate a unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}.${fileExt}`;

  const bucketName = "images"; // Make sure this matches your bucket name in Supabase

  // Upload the file
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/png",
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  if (!data) {
    throw new Error("Upload succeeded but no data returned");
  }

  // Always use signed URLs for now to ensure images work regardless of bucket policy
  // Signed URLs work for both public and private buckets
  // Note: Signed URLs expire after the expiration time (set to 1 year)
  const expiresIn = 60 * 60 * 24 * 365; // 1 year in seconds
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(data.path, expiresIn);

  if (signedError) {
    console.error("Error creating signed URL:", signedError);
    throw new Error(`Failed to create signed URL: ${signedError.message}`);
  }

  if (!signedData?.signedUrl) {
    throw new Error("Failed to get signed URL: No URL returned");
  }

  return signedData.signedUrl;
}

/**
 * Convert a data URL (base64) to a File object
 */
export function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Upload a data URL image to Supabase storage
 */
export async function uploadDataURLToStorage(
  dataUrl: string,
  userId: string,
  filename: string = "generated-image.png"
): Promise<string> {
  const file = dataURLtoFile(dataUrl, filename);
  return uploadImageToStorage(file, userId);
}
