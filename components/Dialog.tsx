import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export type DialogType = "alert" | "confirm" | "prompt";

export interface DialogOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
}

export interface DialogContextValue {
  showDialog: (options: DialogOptions) => Promise<boolean | string | null>;
}

interface DialogProps {
  isOpen: boolean;
  onClose: (result: boolean | string | null) => void;
  options: DialogOptions;
}

export function Dialog({ isOpen, onClose, options }: DialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    title,
    message,
    defaultValue = "",
    confirmText = "OK",
    cancelText = "Cancel",
    type = "alert",
  } = options;

  useEffect(() => {
    if (isOpen && type === "prompt" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen, type]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose(type === "prompt" ? null : false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, type, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === "prompt" && inputRef.current) {
      onClose(inputRef.current.value);
    } else {
      onClose(true);
    }
  };

  const handleCancel = () => {
    onClose(type === "prompt" ? null : false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {title ||
              (type === "prompt"
                ? "Enter"
                : type === "confirm"
                ? "Confirm"
                : "Alert")}
          </h3>
          {type !== "alert" && (
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-4">{message}</p>
          {type === "prompt" && (
            <input
              ref={inputRef}
              type="text"
              defaultValue={defaultValue}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirm();
                }
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          {type !== "alert" && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
