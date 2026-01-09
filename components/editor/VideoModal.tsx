import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (
    url: string,
    align: "left" | "center" | "right",
    primaryColor?: string,
    title?: string
  ) => void;
}

// Helper to validate Cloudflare Stream URL
function isValidCloudflareStreamUrl(url: string): boolean {
  if (!url.trim()) return false;

  // Check for Cloudflare Stream patterns
  const patterns = [
    /customer-[a-zA-Z0-9]+\.cloudflarestream\.com\/[a-zA-Z0-9]+/, // iframe or manifest URLs
    /customer-[a-zA-Z0-9]+\.cloudflarestream\.com\/[a-zA-Z0-9]+\/manifest\/video\.m3u8/, // manifest URL
    /watch\.cloudflarestream\.com\/[a-zA-Z0-9]+/,
    /iframe\.videodelivery\.net\/[a-zA-Z0-9]+/,
    /videodelivery\.net\/[a-zA-Z0-9]+(?:\/manifest\/video\.m3u8)?/,
    /^[a-zA-Z0-9]{16,}$/, // Direct video ID
  ];

  return patterns.some((pattern) => pattern.test(url));
}

export function VideoModal({ isOpen, onClose, onInsert }: VideoModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [primaryColor, setPrimaryColor] = useState("#F48120"); // Default green color
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      setUrl("");
      setTitle("");
      setAlign("center");
      setPrimaryColor("#F48120");
      setUploading(false);
      setUploadError(null);
      setUploadStatus("idle");
      setUploadedFileName(null);
      setVideoReady(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  const handleInsert = () => {
    if (url.trim() && isValidCloudflareStreamUrl(url)) {
      onInsert(url.trim(), align, primaryColor, title);
      onClose();
    }
  };
  const handleSelectFile = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setUploadError("Only video files are supported.");
      event.target.value = "";
      return;
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setUploadError("Video must be smaller than 500MB.");
      event.target.value = "";
      return;
    }

    await uploadVideo(file);
    event.target.value = "";
  };

  const uploadVideo = async (file: File) => {
    if (!session?.access_token) {
      setUploadError("You must be logged in to upload videos.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadStatus("idle");
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/videos/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Upload failed");
      }

      // Use playbackUrl (manifest format) - VideoExtension will extract video ID and customer code from it
      // Format: https://customer-{code}.cloudflarestream.com/{videoId}/manifest/video.m3u8
      const playbackUrl = data.playbackUrl || data.embedUrl;
      if (playbackUrl) {
        setUrl(playbackUrl);
        setVideoReady(data.readyToStream ?? false);
        setUploadStatus("success");
      } else {
        throw new Error("Upload succeeded but no playback URL returned");
      }
    } catch (error) {
      console.error("Video upload error:", error);
      setUploadStatus("error");
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to upload video. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const isUrlValid = url.trim() && isValidCloudflareStreamUrl(url);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Insert Cloudflare Stream Video
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your video"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cloudflare Stream URL or Video ID
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://customer-CODE.cloudflarestream.com/VIDEO_UID/iframe or VIDEO_UID"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${url.trim() && !isUrlValid
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-black"
                }`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isUrlValid) {
                  handleInsert();
                }
              }}
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter a Cloudflare Stream URL or video ID
            </p>
            {url.trim() && !isUrlValid && (
              <p className="mt-1 text-xs text-red-600">
                Please enter a valid Cloudflare Stream URL or video ID
              </p>
            )}
            <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Upload from computer
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    We will upload your video to Cloudflare Stream and fill the
                    URL field above automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Choose Video"}
                </button>
              </div>
              <input
                type="file"
                accept="video/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadedFileName && (
                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">Selected:</span>{" "}
                  {uploadedFileName}
                </p>
              )}
              {uploadStatus === "success" && (
                <>
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Upload complete! The player URL has been filled in above.
                  </p>
                  {videoReady === false && (
                    <p className="mt-2 text-sm text-yellow-600">
                      ⏳ Video is still processing. It may take a few moments
                      before it's ready to play. You can insert it now, but it
                      may show "Video not found" until processing completes.
                    </p>
                  )}
                </>
              )}
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">⚠️ {uploadError}</p>
              )}
              {uploading && (
                <p className="mt-2 text-sm text-gray-500">
                  Uploading video to Cloudflare...
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player Theme Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#F48120"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm font-mono"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Customize the seekbar and play button color
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alignment
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAlign("left")}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${align === "left"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Left
              </button>
              <button
                onClick={() => setAlign("center")}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${align === "center"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Center
              </button>
              <button
                onClick={() => setAlign("right")}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${align === "right"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Right
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!isUrlValid}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Insert Video
          </button>
        </div>
      </div>
    </div>
  );
}
