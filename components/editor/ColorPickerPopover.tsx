"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

type hsl = {
  h: number;
  s: number;
  l: number;
};

type hex = {
  hex: string;
};

type Color = hsl & hex;

const SAVED_COLORS_KEY = "blogish-saved-colors";
const MAX_SAVED_COLORS = 5;

function getSavedColors(): (string | null)[] {
  if (typeof window === "undefined") return Array(MAX_SAVED_COLORS).fill(null);
  try {
    const saved = localStorage.getItem(SAVED_COLORS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure we always have exactly 5 slots
      const colors = Array(MAX_SAVED_COLORS).fill(null);
      for (let i = 0; i < Math.min(parsed.length, MAX_SAVED_COLORS); i++) {
        colors[i] = parsed[i];
      }
      return colors;
    }
  } catch (e) {
    console.error("Error loading saved colors:", e);
  }
  return Array(MAX_SAVED_COLORS).fill(null);
}

function setSavedColors(colors: (string | null)[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(colors));
  } catch (e) {
    console.error("Error saving colors:", e);
  }
}

function hslToHex({ h, s, l }: hsl): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1);
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));

  const toHex = (x: number) => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToHsl({ hex }: hex): hsl {
  let cleanHex = hex.replace(/^#/, "");

  // Handle 3-digit hex
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  // Pad with zeros if incomplete
  while (cleanHex.length < 6) {
    cleanHex += "0";
  }

  // Convert hex to RGB
  let r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  let g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  let b = parseInt(cleanHex.slice(4, 6), 16) || 0;

  // Then convert RGB to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s: number;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
    h *= 360;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

interface DraggableColorCanvasProps extends hsl {
  handleChange: (e: Partial<Color>) => void;
}

const DraggableColorCanvas = ({
  h,
  s,
  l,
  handleChange,
}: DraggableColorCanvasProps) => {
  const [dragging, setDragging] = useState(false);
  const colorAreaRef = useRef<HTMLDivElement>(null);

  const calculateSaturationAndLightness = useCallback(
    (clientX: number, clientY: number) => {
      if (!colorAreaRef.current) return;
      const rect = colorAreaRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const xClamped = Math.max(0, Math.min(x, rect.width));
      const yClamped = Math.max(0, Math.min(y, rect.height));
      const newSaturation = Math.round((xClamped / rect.width) * 100);
      const newLightness = 100 - Math.round((yClamped / rect.height) * 100);
      handleChange({ s: newSaturation, l: newLightness });
    },
    [handleChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      calculateSaturationAndLightness(e.clientX, e.clientY);
    },
    [calculateSaturationAndLightness]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
    calculateSaturationAndLightness(e.clientX, e.clientY);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        calculateSaturationAndLightness(touch.clientX, touch.clientY);
      }
    },
    [calculateSaturationAndLightness]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      setDragging(true);
      calculateSaturationAndLightness(touch.clientX, touch.clientY);
    }
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    dragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // Calculate position of the selector dot
  const dotLeft = `${s}%`;
  const dotTop = `${100 - l}%`;

  return (
    <div
      ref={colorAreaRef}
      className="h-36 w-full touch-auto overscroll-none rounded-lg border border-gray-200 relative cursor-crosshair overflow-hidden"
      style={{
        backgroundColor: `hsl(${h}, 100%, 50%)`,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* White gradient from left */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, #fff, transparent)",
        }}
      />
      {/* Black gradient from bottom */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, #000, transparent)",
        }}
      />
      {/* Selector dot */}
      <div
        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
        style={{
          left: dotLeft,
          top: dotTop,
          transform: "translate(-50%, -50%)",
          backgroundColor: hslToHex({ h, s, l }),
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
};

interface HueSliderProps {
  h: number;
  handleChange: (e: Partial<Color>) => void;
}

const HueSlider = ({ h, handleChange }: HueSliderProps) => {
  const [dragging, setDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const calculateHue = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const xClamped = Math.max(0, Math.min(x, rect.width));
      const newHue = Math.round((xClamped / rect.width) * 360);
      handleChange({ h: newHue });
    },
    [handleChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      calculateHue(e.clientX);
    },
    [calculateHue]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
    calculateHue(e.clientX);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={sliderRef}
      className="h-3 w-full rounded-full relative cursor-pointer"
      style={{
        background:
          "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Slider thumb */}
      <div
        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none top-1/2"
        style={{
          left: `${(h / 360) * 100}%`,
          transform: "translate(-50%, -50%)",
          backgroundColor: `hsl(${h}, 100%, 50%)`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
};

interface ColorPickerPopoverProps {
  initialColor?: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
}

export function ColorPickerPopover({
  initialColor = "#3B82F6",
  onColorChange,
  onClose,
}: ColorPickerPopoverProps) {
  const [color, setColor] = useState<Color>(() => {
    const hsl = hexToHsl({ hex: initialColor });
    return { ...hsl, hex: initialColor.toUpperCase() };
  });
  const [hexInput, setHexInput] = useState(initialColor.toUpperCase());
  const [savedColors, setSavedColorsState] = useState<(string | null)[]>(() => 
    getSavedColors()
  );

  const handleChange = useCallback((partial: Partial<Color>) => {
    setColor((prev) => {
      const newHsl = {
        h: partial.h ?? prev.h,
        s: partial.s ?? prev.s,
        l: partial.l ?? prev.l,
      };
      const newHex = hslToHex(newHsl);
      setHexInput(newHex);
      return { ...newHsl, hex: newHex };
    });
  }, []);

  const handleHexInputChange = (value: string) => {
    // Allow typing with or without #
    let cleanValue = value.toUpperCase();
    if (!cleanValue.startsWith("#")) {
      cleanValue = "#" + cleanValue;
    }
    setHexInput(cleanValue);

    // Only update color if valid hex
    const hexRegex = /^#[0-9A-F]{6}$/i;
    if (hexRegex.test(cleanValue)) {
      const hsl = hexToHsl({ hex: cleanValue });
      setColor({ ...hsl, hex: cleanValue });
    }
  };

  const handleApply = () => {
    onColorChange(color.hex);
    onClose();
  };

  const handleSaveColor = () => {
    // Find first empty slot, or use the last one
    const newSavedColors = [...savedColors];
    const emptyIndex = newSavedColors.findIndex((c) => c === null);
    if (emptyIndex !== -1) {
      newSavedColors[emptyIndex] = color.hex;
    } else {
      // Shift colors left and add new one at the end
      newSavedColors.shift();
      newSavedColors.push(color.hex);
    }
    setSavedColorsState(newSavedColors);
    setSavedColors(newSavedColors);
  };

  const handleRemoveSavedColor = (index: number) => {
    const newSavedColors = [...savedColors];
    newSavedColors[index] = null;
    // Compact: move all non-null to the front
    const compacted: (string | null)[] = newSavedColors.filter((c) => c !== null);
    while (compacted.length < MAX_SAVED_COLORS) {
      compacted.push(null);
    }
    setSavedColorsState(compacted);
    setSavedColors(compacted);
  };

  const handleSelectSavedColor = (colorHex: string) => {
    const hsl = hexToHsl({ hex: colorHex });
    setColor({ ...hsl, hex: colorHex });
    setHexInput(colorHex);
  };

  // Quick colors for convenience - two rows
  const quickColorsRow1 = [
    "#000000", // Black
    "#FFFFFF", // White
    "#6B7280", // Gray
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Amber
    "#84CC16", // Lime
    "#22C55E", // Green
  ];
  const quickColorsRow2 = [
    "#14B8A6", // Teal
    "#06B6D4", // Cyan
    "#3B82F6", // Blue
    "#6366F1", // Indigo
    "#8B5CF6", // Violet
    "#A855F7", // Purple
    "#EC4899", // Pink
    "#F43F5E", // Rose
  ];

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-64"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Color Canvas */}
      <DraggableColorCanvas
        h={color.h}
        s={color.s}
        l={color.l}
        handleChange={handleChange}
      />

      {/* Hue Slider */}
      <div className="mt-3">
        <HueSlider h={color.h} handleChange={handleChange} />
      </div>

      {/* Quick Colors - Two Rows */}
      <div className="mt-3 space-y-1.5">
        <div className="flex gap-1.5 justify-center">
          {quickColorsRow1.map((qc) => (
            <button
              key={qc}
              className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${qc === "#FFFFFF" ? "border-2 border-gray-300" : "border border-gray-200"}`}
              style={{ backgroundColor: qc }}
              onClick={() => {
                const hsl = hexToHsl({ hex: qc });
                setColor({ ...hsl, hex: qc });
                setHexInput(qc);
              }}
              title={qc}
            />
          ))}
        </div>
        <div className="flex gap-1.5 justify-center">
          {quickColorsRow2.map((qc) => (
            <button
              key={qc}
              className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
              style={{ backgroundColor: qc }}
              onClick={() => {
                const hsl = hexToHsl({ hex: qc });
                setColor({ ...hsl, hex: qc });
                setHexInput(qc);
              }}
              title={qc}
            />
          ))}
        </div>
      </div>

      {/* Hex Input */}
      <div className="mt-3 flex gap-2 items-center">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            #
          </span>
          <input
            type="text"
            value={hexInput.replace("#", "")}
            onChange={(e) => handleHexInputChange(e.target.value)}
            className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            maxLength={6}
          />
        </div>
        <div
          className="w-8 h-8 rounded-lg border border-gray-300 flex-shrink-0"
          style={{ backgroundColor: color.hex }}
        />
      </div>

      {/* Saved Colors */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-medium">Saved colors</span>
          <button
            onClick={handleSaveColor}
            className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5 font-medium"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
        <div className="flex gap-1.5">
          {savedColors.map((savedColor, index) => (
            <div key={index} className="relative group">
              {savedColor ? (
                <>
                  <button
                    className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-all hover:scale-105"
                    style={{ backgroundColor: savedColor }}
                    onClick={() => handleSelectSavedColor(savedColor)}
                    title={savedColor}
                  />
                  <button
                    onClick={() => handleRemoveSavedColor(index)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </>
              ) : (
                <div className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

