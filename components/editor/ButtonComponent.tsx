import { NodeViewWrapper } from "@tiptap/react";
import { MouseEvent } from "react";

export const ButtonComponent = ({ node }: any) => {
  const { text, url, variant, color, customColor, customColorSecondary, useGradient, gradientDirection, size, radius, align } = node.attrs;

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    // In editor, we don't actually navigate
    console.log("Button click:", url);
  };

  // Size classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  // Radius classes
  const radiusClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  // Color and variant combinations
  const getButtonClasses = () => {
    const baseClasses =
      "font-medium transition-all duration-200 inline-flex items-center justify-center cursor-pointer border";

    // For custom colors, return base classes only (remove border class)
    if (color === "custom") {
      const base = `font-medium transition-all duration-200 inline-flex items-center justify-center cursor-pointer ${sizeClasses[size as keyof typeof sizeClasses]} ${radiusClasses[radius as keyof typeof radiusClasses]}`;
      if (variant === "shadow") return `${base} shadow-lg`;
      return base;
    }

    const variantColorClasses: Record<
      string,
      Record<string, string>
    > = {
      solid: {
        default: "bg-gray-700 text-white border-gray-700 hover:bg-gray-800",
        primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
        secondary:
          "bg-purple-600 text-white border-purple-600 hover:bg-purple-700",
        success: "bg-green-600 text-white border-green-600 hover:bg-green-700",
        warning:
          "bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600",
        danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
      },
      bordered: {
        default:
          "bg-transparent text-gray-700 border-gray-300 hover:bg-gray-50",
        primary:
          "bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50",
        secondary:
          "bg-transparent text-purple-600 border-purple-600 hover:bg-purple-50",
        success:
          "bg-transparent text-green-600 border-green-600 hover:bg-green-50",
        warning:
          "bg-transparent text-yellow-600 border-yellow-600 hover:bg-yellow-50",
        danger: "bg-transparent text-red-600 border-red-600 hover:bg-red-50",
      },
      light: {
        default: "bg-gray-100 text-gray-700 border-gray-100 hover:bg-gray-200",
        primary: "bg-blue-100 text-blue-700 border-blue-100 hover:bg-blue-200",
        secondary:
          "bg-purple-100 text-purple-700 border-purple-100 hover:bg-purple-200",
        success:
          "bg-green-100 text-green-700 border-green-100 hover:bg-green-200",
        warning:
          "bg-yellow-100 text-yellow-700 border-yellow-100 hover:bg-yellow-200",
        danger: "bg-red-100 text-red-700 border-red-100 hover:bg-red-200",
      },
      flat: {
        default:
          "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200",
        primary:
          "bg-blue-100 text-blue-700 border-transparent hover:bg-blue-200",
        secondary:
          "bg-purple-100 text-purple-700 border-transparent hover:bg-purple-200",
        success:
          "bg-green-100 text-green-700 border-transparent hover:bg-green-200",
        warning:
          "bg-yellow-100 text-yellow-700 border-transparent hover:bg-yellow-200",
        danger: "bg-red-100 text-red-700 border-transparent hover:bg-red-200",
      },
      faded: {
        default:
          "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
        primary: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        secondary:
          "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
        success:
          "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        warning:
          "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
        danger: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
      },
      shadow: {
        default:
          "bg-gray-700 text-white border-gray-700 hover:bg-gray-800 shadow-lg shadow-gray-500/50",
        primary:
          "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/50",
        secondary:
          "bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/50",
        success:
          "bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-lg shadow-green-500/50",
        warning:
          "bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-500/50",
        danger:
          "bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50",
      },
      ghost: {
        default:
          "bg-transparent text-gray-700 border-transparent hover:bg-gray-100",
        primary:
          "bg-transparent text-blue-600 border-transparent hover:bg-blue-50",
        secondary:
          "bg-transparent text-purple-600 border-transparent hover:bg-purple-50",
        success:
          "bg-transparent text-green-600 border-transparent hover:bg-green-50",
        warning:
          "bg-transparent text-yellow-600 border-transparent hover:bg-yellow-50",
        danger:
          "bg-transparent text-red-600 border-transparent hover:bg-red-50",
      },
    };

    return `${baseClasses} ${sizeClasses[size as keyof typeof sizeClasses]} ${radiusClasses[radius as keyof typeof radiusClasses]} ${variantColorClasses[variant]?.[color] || variantColorClasses.solid.primary}`;
  };

  // Alignment classes
  const alignmentClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  // Get custom styles for custom color buttons
  const getCustomStyles = () => {
    // Only apply if custom color is selected
    if (color !== "custom") return {};

    const customColorValue = customColor || "#3B82F6";

    // Ghost: transparent bg/border, colored text
    if (variant === "ghost") {
      return {
        backgroundColor: "transparent",
        borderColor: "transparent",
        borderWidth: "1px",
        borderStyle: "solid",
        color: customColorValue,
      };
    }

    // Bordered/Light/Flat/Faded: transparent bg, colored border/text
    // We treat "light/flat/faded" as bordered for custom to ensure text visibility
    if (variant === "bordered" || variant === "light" || variant === "flat" || variant === "faded") {
      return {
        backgroundColor: "transparent",
        borderColor: customColorValue,
        borderWidth: "1px",
        borderStyle: "solid",
        color: customColorValue,
      };
    }

    // Solid/Shadow: Colored bg, white text
    return {
      backgroundColor: customColorValue,
      borderColor: customColorValue,
      borderWidth: "1px",
      borderStyle: "solid",
      color: "white",
      boxShadow: variant === "shadow" ? `0 10px 15px -3px ${customColorValue}80` : undefined,
    };
  };

  return (
    <NodeViewWrapper
      className={`my-4 ${alignmentClasses[align as keyof typeof alignmentClasses]}`}
      data-type="button"
    >
      <button
        onClick={handleClick}
        className={getButtonClasses()}
        style={getCustomStyles()}
        data-button-url={url}
      >
        {text}
      </button>
    </NodeViewWrapper>
  );
};
