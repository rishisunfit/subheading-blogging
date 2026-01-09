import { useState } from "react";
import { X, Send, Mail, Phone, Loader2 } from "lucide-react";

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string | null;
  phone: string | null;
  onSubmit: (message: string) => Promise<void>;
}

export function ReplyModal({
  isOpen,
  onClose,
  email,
  phone,
  onSubmit,
}: ReplyModalProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSubmit(message.trim());
      setMessage("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const contactMethod = email ? "Email" : phone ? "SMS" : null;
  const contactValue = email || phone || "";

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

        <h3 className="text-xl font-bold text-gray-900 mb-4">Send Reply</h3>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            {email ? (
              <>
                <Mail size={16} />
                <span>Sending to Email:</span>
              </>
            ) : phone ? (
              <>
                <Phone size={16} />
                <span>Sending to Phone:</span>
              </>
            ) : null}
          </div>
          <div className="text-gray-900 font-medium">{contactValue}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reply-message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Reply
            </label>
            <textarea
              id="reply-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(null);
              }}
              placeholder="Type your reply message here..."
              rows={6}
              disabled={isSending}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !message.trim()}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send {contactMethod}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
