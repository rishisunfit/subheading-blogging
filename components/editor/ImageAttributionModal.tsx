import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

export interface ImageAttributionValues {
  imageUrl: string;
  alt?: string;
  sourceUrl: string;
  sourceName?: string;
  year?: string;
  licenseNote?: string;
  showAttribution: boolean;
}

interface ImageAttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (values: ImageAttributionValues) => void;
}

function guessSourceNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const parts = host.split(".").filter(Boolean);
    if (parts.length === 0) return "Source";
    const core =
      parts.length >= 2 && parts[parts.length - 1].length <= 3
        ? parts[parts.length - 2]
        : parts[0];
    const words = core.split(/[-_]/g).filter(Boolean);
    const titled = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return titled || "Source";
  } catch {
    return "Source";
  }
}

export function ImageAttributionModal({
  isOpen,
  onClose,
  onInsert,
}: ImageAttributionModalProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [year, setYear] = useState("");
  const [licenseNote, setLicenseNote] = useState("");
  const [showAttribution, setShowAttribution] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setImageUrl("");
    setAlt("");
    setSourceUrl("");
    setSourceName("");
    setYear("");
    setLicenseNote("");
    setShowAttribution(true);
  }, [isOpen]);

  useEffect(() => {
    if (!sourceUrl) return;
    if (sourceName.trim().length > 0) return;
    setSourceName(guessSourceNameFromUrl(sourceUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl]);

  const isValid = useMemo(() => {
    const hasImage = imageUrl.trim().length > 0;
    const hasSource = sourceUrl.trim().length > 0;
    return hasImage && hasSource;
  }, [imageUrl, sourceUrl]);

  const captionPreview = useMemo(() => {
    if (!showAttribution || !sourceUrl) return "";
    const name =
      (sourceName && sourceName.trim()) || guessSourceNameFromUrl(sourceUrl);
    const y = year && year.trim() ? ` (${year.trim()})` : "";
    return `Image: ${name}${y}.`;
  }, [showAttribution, sourceUrl, sourceName, year]);

  if (!isOpen) return null;

  const handleInsert = () => {
    if (!isValid) return;
    onInsert({
      imageUrl: imageUrl.trim(),
      alt: alt.trim() || undefined,
      sourceUrl: sourceUrl.trim(),
      sourceName: sourceName.trim() || undefined,
      year: year.trim() || undefined,
      licenseNote: licenseNote.trim() || undefined,
      showAttribution,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          type="button"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Add Image from Web
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL <span className="text-red-600">*</span>
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…/image.png"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source URL <span className="text-red-600">*</span>
            </label>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://… (page where the image came from)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-500 mt-2">
              Required for publishing when the image is not yours.
            </p>
          </div>

          <details className="rounded-lg border border-gray-200 p-4">
            <summary className="cursor-pointer select-none font-medium text-gray-900">
              Attribution (optional)
            </summary>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Show attribution under image
                </div>
                <button
                  type="button"
                  onClick={() => setShowAttribution((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                    showAttribution
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {showAttribution ? "On" : "Off"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source name
                </label>
                <input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g., Cleveland Clinic"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g., 2022"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alt text
                  </label>
                  <input
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    placeholder="Describe the image"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License note
                </label>
                <input
                  value={licenseNote}
                  onChange={(e) => setLicenseNote(e.target.value)}
                  placeholder="e.g., Used for educational reference"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {captionPreview ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                  <div className="font-medium text-gray-900 mb-1">
                    Caption preview
                  </div>
                  <div>{captionPreview}</div>
                </div>
              ) : null}
            </div>
          </details>

          <div className="flex items-center justify-end gap-3 pt-2">
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
              disabled={!isValid}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
