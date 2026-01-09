import { useState } from "react";
import { X, ExternalLink } from "lucide-react";

interface ButtonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (buttonConfig: ButtonConfig) => void;
}

export interface ButtonConfig {
  text: string;
  url: string;
  variant: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";
  color: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "custom";
  customColor?: string;
  size: "sm" | "md" | "lg";
  radius: "none" | "sm" | "md" | "lg" | "full";
  align: "left" | "center" | "right";
}

export function ButtonModal({ isOpen, onClose, onInsert }: ButtonModalProps) {
  const [config, setConfig] = useState<ButtonConfig>({
    text: "Click Me",
    url: "",
    variant: "solid",
    color: "primary",
    size: "md",
    radius: "md",
    align: "center",
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!config.text.trim()) {
      alert("Please enter button text");
      return;
    }
    if (!config.url.trim()) {
      alert("Please enter a URL");
      return;
    }

    // Ensure custom colors have defaults if not set
    const finalConfig = { ...config };
    if (config.color === "custom") {
      finalConfig.customColor = config.customColor || "#3B82F6";
    }

    onInsert(finalConfig);
    onClose();
    // Reset config
    setConfig({
      text: "Click Me",
      url: "",
      variant: "solid",
      color: "primary",
      size: "md",
      radius: "md",
      align: "center",
      customColor: "#3B82F6",
    });
  };

  // Preview button styles
  const getPreviewClasses = () => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const radiusClasses = {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full",
    };

    const variantColorClasses: Record<string, Record<string, string>> = {
      solid: {
        default: "bg-gray-700 text-white border-gray-700",
        primary: "bg-blue-600 text-white border-blue-600",
        secondary: "bg-purple-600 text-white border-purple-600",
        success: "bg-green-600 text-white border-green-600",
        warning: "bg-yellow-500 text-white border-yellow-500",
        danger: "bg-red-600 text-white border-red-600",
      },
      bordered: {
        default: "bg-transparent text-gray-700 border-gray-300",
        primary: "bg-transparent text-blue-600 border-blue-600",
        secondary: "bg-transparent text-purple-600 border-purple-600",
        success: "bg-transparent text-green-600 border-green-600",
        warning: "bg-transparent text-yellow-600 border-yellow-600",
        danger: "bg-transparent text-red-600 border-red-600",
      },
      light: {
        default: "bg-gray-100 text-gray-700 border-gray-100",
        primary: "bg-blue-100 text-blue-700 border-blue-100",
        secondary: "bg-purple-100 text-purple-700 border-purple-100",
        success: "bg-green-100 text-green-700 border-green-100",
        warning: "bg-yellow-100 text-yellow-700 border-yellow-100",
        danger: "bg-red-100 text-red-700 border-red-100",
      },
      flat: {
        default: "bg-gray-100 text-gray-700 border-transparent",
        primary: "bg-blue-100 text-blue-700 border-transparent",
        secondary: "bg-purple-100 text-purple-700 border-transparent",
        success: "bg-green-100 text-green-700 border-transparent",
        warning: "bg-yellow-100 text-yellow-700 border-transparent",
        danger: "bg-red-100 text-red-700 border-transparent",
      },
      faded: {
        default: "bg-gray-50 text-gray-700 border-gray-200",
        primary: "bg-blue-50 text-blue-700 border-blue-200",
        secondary: "bg-purple-50 text-purple-700 border-purple-200",
        success: "bg-green-50 text-green-700 border-green-200",
        warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
        danger: "bg-red-50 text-red-700 border-red-200",
      },
      shadow: {
        default: "bg-gray-700 text-white border-gray-700 shadow-lg shadow-gray-500/50",
        primary: "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/50",
        secondary: "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/50",
        success: "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/50",
        warning: "bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/50",
        danger: "bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/50",
      },
      ghost: {
        default: "bg-transparent text-gray-700 border-transparent",
        primary: "bg-transparent text-blue-600 border-transparent",
        secondary: "bg-transparent text-purple-600 border-transparent",
        success: "bg-transparent text-green-600 border-transparent",
        warning: "bg-transparent text-yellow-600 border-transparent",
        danger: "bg-transparent text-red-600 border-transparent",
      },
    };

    // For custom colors, don't apply preset color classes - use inline styles instead
    // Also remove 'border' class to avoid conflicts, we'll adds styles manually
    if (config.color === "custom") {
      const base = `font-medium transition-all duration-200 inline-flex items-center justify-center ${sizeClasses[config.size]} ${radiusClasses[config.radius]}`;
      // Add shadow class for shadow variant and custom color
      if (config.variant === "shadow") return `${base} shadow-lg`;
      return base;
    }

    return `font-medium transition-all duration-200 inline-flex items-center justify-center border ${sizeClasses[config.size]} ${radiusClasses[config.radius]} ${variantColorClasses[config.variant][config.color]}`;
  };

  const alignmentClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  const getCustomStyle = () => {
    const color = config.customColor || "#3B82F6";

    // Ghost: transparent bg/border, colored text
    if (config.variant === "ghost") {
      return {
        backgroundColor: "transparent",
        borderColor: "transparent",
        borderWidth: "1px",
        borderStyle: "solid",
        color: color,
      };
    }

    // Bordered/Light/Flat/Faded: transparent bg, colored border/text
    // We treat "light/flat/faded" as bordered for custom to ensure text visibility and simplicity
    if (["bordered", "light", "flat", "faded"].includes(config.variant)) {
      return {
        backgroundColor: "transparent",
        borderColor: color,
        borderWidth: "1px",
        borderStyle: "solid",
        color: color,
      };
    }

    // Solid/Shadow: Colored bg, white text
    return {
      backgroundColor: color,
      borderColor: color,
      borderWidth: "1px",
      borderStyle: "solid",
      color: "white",
      // Shadow variant gets shadow via class, but we can add specific colored shadow if needed
      boxShadow: config.variant === "shadow" ? `0 10px 15px -3px ${color}80` : undefined,
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Add Button</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
            <p className="text-sm text-gray-600 mb-4 text-center font-medium">
              Button Preview
            </p>
            <div className={`flex ${alignmentClasses[config.align]}`}>
              <button
                className={getPreviewClasses()}
                style={config.color === "custom" ? getCustomStyle() : undefined}
              >
                {config.text}
              </button>
            </div>
          </div>

          {/* Button Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Button Text
            </label>
            <input
              type="text"
              value={config.text}
              onChange={(e) => setConfig({ ...config, text: e.target.value })}
              placeholder="Enter button text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL <ExternalLink className="inline" size={14} />
            </label>
            <input
              type="url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Variant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variant
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["solid", "bordered", "light", "flat", "faded", "shadow", "ghost"].map(
                (variant) => (
                  <button
                    key={variant}
                    onClick={() =>
                      setConfig({
                        ...config,
                        variant: variant as ButtonConfig["variant"],
                      })
                    }
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${config.variant === variant
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "default", label: "Default", color: "gray" },
                { value: "primary", label: "Primary", color: "blue" },
                { value: "secondary", label: "Secondary", color: "purple" },
                { value: "success", label: "Success", color: "green" },
                { value: "warning", label: "Warning", color: "yellow" },
                { value: "danger", label: "Danger", color: "red" },
                { value: "custom", label: "Custom", color: "purple" },
              ].map((color) => (
                <button
                  key={color.value}
                  onClick={() =>
                    setConfig({
                      ...config,
                      color: color.value as ButtonConfig["color"],
                    })
                  }
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${config.color === color.value
                    ? `bg-${color.color}-100 border-${color.color}-500 text-${color.color}-700`
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Options */}
          {config.color === "custom" && (
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.customColor || "#3B82F6"}
                    onChange={(e) =>
                      setConfig({ ...config, customColor: e.target.value })
                    }
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.customColor || "#3B82F6"}
                    onChange={(e) =>
                      setConfig({ ...config, customColor: e.target.value })
                    }
                    placeholder="#3B82F6"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["sm", "md", "lg"].map((size) => (
                <button
                  key={size}
                  onClick={() =>
                    setConfig({ ...config, size: size as ButtonConfig["size"] })
                  }
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${config.size === size
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {size.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Border Radius
            </label>
            <div className="grid grid-cols-5 gap-2">
              {["none", "sm", "md", "lg", "full"].map((radius) => (
                <button
                  key={radius}
                  onClick={() =>
                    setConfig({
                      ...config,
                      radius: radius as ButtonConfig["radius"],
                    })
                  }
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${config.radius === radius
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {radius.charAt(0).toUpperCase() + radius.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alignment
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["left", "center", "right"].map((align) => (
                <button
                  key={align}
                  onClick={() =>
                    setConfig({
                      ...config,
                      align: align as ButtonConfig["align"],
                    })
                  }
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${config.align === align
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
          >
            Insert Button
          </button>
        </div>
      </div>
    </div>
  );
}
