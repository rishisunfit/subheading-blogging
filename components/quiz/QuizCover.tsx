"use client";

import { QuizCoverPage, QuizStyles } from "@/types/quiz";
import { ArrowRight, Sparkles } from "lucide-react";

interface QuizCoverProps {
  cover: QuizCoverPage;
  styles: QuizStyles;
  onStart: () => void;
  showDescription?: boolean;
  showResponsesButton?: boolean;
  skipContactCollection?: boolean;
  hasPriorCompletion?: boolean;
  onShowResults?: () => void;
}

export function QuizCover({
  cover,
  styles,
  onStart,
  showDescription = true,
  showResponsesButton = false,
  skipContactCollection = false,
  hasPriorCompletion = false,
  onShowResults,
}: QuizCoverProps) {
  const getBorderRadius = () => {
    switch (styles.borderRadius) {
      case "none":
        return "0";
      case "small":
        return "0.5rem";
      case "medium":
        return "1rem";
      case "large":
        return "1.5rem";
      case "full":
        return "2rem";
      default:
        return "1rem";
    }
  };

  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-12"
      style={{ fontFamily: styles.fontFamily }}
    >
      {/* Decorative element */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 rotate-12"
        style={{
          backgroundColor: `${styles.secondaryColor}15`,
          color: styles.secondaryColor,
        }}
      >
        <Sparkles size={32} />
      </div>

      {/* Subtitle */}
      {cover.subtitle && (
        <p
          className="text-sm md:text-base font-medium tracking-wide uppercase mb-4"
          style={{ color: styles.secondaryColor }}
        >
          {cover.subtitle}
        </p>
      )}

      {/* Title */}
      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-3xl leading-tight"
        style={{ color: styles.textColor }}
      >
        {cover.title}
      </h1>

      {/* Description */}
      {showDescription && cover.description && (
        <p
          className="text-lg md:text-xl max-w-xl mb-10 opacity-70 leading-relaxed"
          style={{ color: styles.textColor }}
        >
          {cover.description}
        </p>
      )}

      {/* Image */}
      {cover.imageUrl && (
        <div
          className="w-full max-w-md mb-10 overflow-hidden shadow-xl"
          style={{ borderRadius: getBorderRadius() }}
        >
          <img src={cover.imageUrl} alt="" className="w-full h-auto" />
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={onStart}
        className="group px-8 py-4 text-lg font-semibold transition-all duration-300 flex items-center gap-3 hover:gap-4 shadow-lg hover:shadow-xl"
        style={{
          backgroundColor: styles.primaryColor,
          color: "#ffffff",
          borderRadius: getBorderRadius(),
        }}
      >
        {cover.buttonText}
        <ArrowRight
          size={20}
          className="transition-transform group-hover:translate-x-1"
        />
      </button>

      {/* Time estimate and No Email Required */}
      <div className="flex flex-col items-center gap-1 mt-6">
        <p
          className="text-sm opacity-50"
          style={{ color: styles.textColor }}
        >
          Takes about 2 minutes
        </p>
        {skipContactCollection && (
          <p
            className="text-sm font-medium opacity-70"
            style={{ color: styles.textColor }}
          >
            No Email Required
          </p>
        )}
      </div>

      {/* Show Responses Button (Visible only if enabled AND has prior completion) */}
      {showResponsesButton && hasPriorCompletion && (
        <button
          onClick={() => {
            if (onShowResults) {
              onShowResults();
            }
          }}
          className="mt-6 group px-8 py-4 text-lg font-semibold transition-all duration-300 flex items-center gap-3 hover:gap-4 shadow-lg hover:shadow-xl"
          style={{
            backgroundColor: styles.secondaryColor,
            color: "#ffffff",
            borderRadius: getBorderRadius(),
          }}
        >
          Show my previous results
          <ArrowRight
            size={20}
            className="transition-transform group-hover:translate-x-1"
          />
        </button>
      )}
    </div>
  );
}
