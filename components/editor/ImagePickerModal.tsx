import { useRef } from "react";
import { X, Sparkles, Upload, Globe, History } from "lucide-react";

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: File) => void;
  onGenerateWithAI: () => void;
  onFromWeb: () => void;
  onFromHistory: () => void;
}

export function ImagePickerModal({
  isOpen,
  onClose,
  onSelectFile,
  onGenerateWithAI,
  onFromWeb,
  onFromHistory,
}: ImagePickerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
      onClose();
    }
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

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

        <h3 className="text-xl font-bold text-gray-900 mb-6">Add Image</h3>

        <div className="space-y-3">
          <button
            onClick={onGenerateWithAI}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <Sparkles className="text-gray-900" size={24} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                Generate with AI
              </div>
              <div className="text-sm text-gray-600">
                Create an image using AI
              </div>
            </div>
          </button>

          <button
            onClick={handlePickFile}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <Upload className="text-gray-900" size={24} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Pick a file</div>
              <div className="text-sm text-gray-600">
                Upload an image from your device
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onFromWeb();
              onClose();
            }}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <Globe className="text-gray-900" size={24} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">From Web</div>
              <div className="text-sm text-gray-600">
                Paste an image URL and add attribution
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onFromHistory();
              onClose();
            }}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <History className="text-gray-900" size={24} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                Load from History
              </div>
              <div className="text-sm text-gray-600">
                Select from your previously uploaded images
              </div>
            </div>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
