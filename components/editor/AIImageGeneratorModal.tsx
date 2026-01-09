import { useState, useRef } from "react";
import { X, Sparkles, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { uploadDataURLToStorage } from "@/lib/storage";
import { genHistoryApi } from "@/services/genHistory";
import { mediaApi } from "@/services/media";

interface AIImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseImage: (imageUrl: string) => void;
}

type AspectRatio = "4:5" | "2:3" | "1:1" | "16:9" | "9:16";

export function AIImageGeneratorModal({
  isOpen,
  onClose,
  onUseImage,
}: AIImageGeneratorModalProps) {
  const { user, session } = useAuth();
  const [text, setText] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [selectedModel, setSelectedModel] = useState<string>(
    "gemini-2.5-flash-image"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setReferenceImage(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setGeneratedImage(null);

    if (!text.trim()) {
      setError("Please enter a text description");
      return;
    }

    setLoading(true);

    try {
      // You'll need to set up an API endpoint for image generation
      // For now, using a placeholder - you'll need to create /api/generate endpoint
      const formData = new FormData();
      formData.append("text", text);
      formData.append("negativePrompt", negativePrompt);
      formData.append("aspectRatio", aspectRatio);
      formData.append("numberOfImages", "1");
      formData.append("model", selectedModel);
      if (referenceImage) {
        formData.append("image", referenceImage);
      }

      // Use the API endpoint (works with both vercel dev and production)
      // When using `vercel dev`, it handles API routes automatically
      // In production, Vercel routes /api/* to serverless functions
      const apiUrl =
        process.env.NEXT_PUBLIC_IMAGE_GENERATOR_API_URL || "/api/generate";

      // Get the access token from the session
      if (!session?.access_token) {
        setError("You must be logged in to generate images");
        setLoading(false);
        return;
      }

      console.log("Sending request to:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        // Try to parse error response, but handle empty responses
        let errorMessage = `Failed to generate image (${response.status})`;
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch {
          // If JSON parsing fails, use the status text or default message
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      let data;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error(
            `Unexpected response format: ${text.substring(0, 100)}`
          );
        }
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        const errorMsg =
          parseError instanceof Error ? parseError.message : "Unknown error";
        throw new Error(
          `Failed to parse API response: ${errorMsg}. Please try again.`
        );
      }

      const imageUrl = data.imageUrl || data.imageUrls?.[0];

      if (!imageUrl) {
        throw new Error("No image returned from API");
      }

      setGeneratedImage(imageUrl);

      // Save to history and upload to Supabase storage
      if (user) {
        try {
          const uploadedUrl = await uploadDataURLToStorage(
            imageUrl,
            user.id,
            "generated-image.png"
          );

          // Save to history (keeping gen_history for backward compatibility)
          await genHistoryApi.create({
            image_url: uploadedUrl,
            prompt: text,
            negative_prompt: negativePrompt || undefined,
            aspect_ratio: aspectRatio,
            model: selectedModel,
          });

          // Also save to media table
          await mediaApi.create({
            type: "image",
            url: uploadedUrl,
            source: "ai_generated",
            metadata: {
              prompt: text,
              negative_prompt: negativePrompt || undefined,
              aspect_ratio: aspectRatio,
              model: selectedModel,
            },
          });
        } catch (err) {
          console.error("Error saving to history:", err);
          // Don't throw - image generation succeeded, history save is optional
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUseImage = () => {
    if (generatedImage) {
      onUseImage(generatedImage);
      onClose();
    }
  };

  const aspectRatios: { value: AspectRatio; label: string }[] = [
    { value: "4:5", label: "4:5" },
    { value: "2:3", label: "2:3" },
    { value: "1:1", label: "1:1" },
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Sparkles className="text-gray-900" size={28} />
            Generate Image with AI
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            {/* Left: Generated Image Display */}
            <div className="bg-gray-50 rounded-lg p-6 min-h-[400px] flex items-center justify-center border border-gray-200">
              {loading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating your image...</p>
                </div>
              ) : generatedImage ? (
                <div className="w-full">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-auto rounded-lg mb-4 border border-gray-200"
                  />
                  <button
                    onClick={handleUseImage}
                    className="w-full py-3 px-6 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                  >
                    Use this image
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Sparkles size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Generated image will appear here</p>
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="space-y-5">
              {/* Model Selection */}
              <div>
                <label className="block mb-2 font-semibold text-gray-900 text-sm">
                  Model
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedModel("gemini-2.5-flash-image")}
                    className={`w-full p-3 border rounded-lg text-left transition-all ${
                      selectedModel === "gemini-2.5-flash-image"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-gray-900 text-sm">
                      Gemini 2.5 Flash Image
                    </div>
                    <p className="text-gray-600 text-xs mt-1">
                      Faster generation
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedModel("gemini-3-pro-image-preview")
                    }
                    className={`w-full p-3 border rounded-lg text-left transition-all ${
                      selectedModel === "gemini-3-pro-image-preview"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-gray-900 text-sm">
                      Gemini 3 Pro Image
                    </div>
                    <p className="text-gray-600 text-xs mt-1">Higher quality</p>
                  </button>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block mb-2 font-semibold text-gray-900 text-sm">
                  Describe your image
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Cute black panther cub wearing a purple hoodie."
                  rows={3}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y bg-white"
                />
              </div>

              {/* Negative Prompt */}
              <div>
                <label className="block mb-2 font-semibold text-gray-900 text-sm">
                  What you DON&apos;T want (Optional)
                </label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="blurry, low quality"
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                />
              </div>

              {/* Reference Image */}
              <div>
                <label className="block mb-2 font-semibold text-gray-900 text-sm">
                  Reference Image (Optional)
                </label>
                {!preview ? (
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-gray-400 transition-colors bg-white">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-center">
                      <Upload
                        className="mx-auto mb-2 text-gray-400"
                        size={24}
                      />
                      <p className="text-sm text-gray-600">Click to upload</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg bg-white">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded border border-gray-200"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {referenceImage?.name}
                      </p>
                    </div>
                    <button
                      onClick={removeImage}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block mb-2 font-semibold text-gray-900 text-sm">
                  Image Ratio
                </label>
                <div className="flex gap-2 flex-wrap">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      type="button"
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`py-2 px-4 border rounded-lg text-sm font-semibold transition-all ${
                        aspectRatio === ratio.value
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 text-gray-700 hover:border-gray-400 bg-white"
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !text.trim()}
                className="w-full py-3 px-6 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Generating..." : "Generate Image"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
