import { useState, useEffect } from "react";
import { X, Trash2, Clock } from "lucide-react";
import { mediaApi, type MediaEntry } from "@/services/media";
import { useDialog } from "@/hooks/useDialog";

interface ImageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
}

export function ImageHistoryModal({
  isOpen,
  onClose,
  onSelectImage,
}: ImageHistoryModalProps) {
  const [history, setHistory] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { showDialog } = useDialog();

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // Get all images from media table (filter by type: "image")
      const data = await mediaApi.getAll("image");
      setHistory(data);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showDialog({
      type: "confirm",
      title: "Delete Image",
      message: "Are you sure you want to delete this image from history?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (confirmed) {
      try {
        await mediaApi.delete(id);
        setHistory(history.filter((item) => item.id !== id));
      } catch (error) {
        console.error("Error deleting history:", error);
        await showDialog({
          type: "alert",
          title: "Error",
          message: "Failed to delete image from history",
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-xl font-bold text-gray-900">Image History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No images yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => {
                // Get display text from metadata or use a default
                const displayText =
                  item.metadata?.prompt ||
                  item.metadata?.filename ||
                  item.metadata?.source_name ||
                  "Image";
                const aspectRatio = item.metadata?.aspect_ratio || "Unknown";

                return (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="relative aspect-square bg-gray-100">
                      <img
                        src={item.url}
                        alt={displayText}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          onSelectImage(item.url);
                          onClose();
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                        {displayText}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(item.created_at)}</span>
                        {aspectRatio !== "Unknown" && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {aspectRatio}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
