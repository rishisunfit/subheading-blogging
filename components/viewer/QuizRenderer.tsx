"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QuizEmbed } from "./QuizEmbed";

interface QuizRendererProps {
  quizId?: string | null;
  skipInlineScan?: boolean;
  showDescription?: boolean;
  showResponsesButton?: boolean;
  showResponsesPreview?: boolean;
  skipContactCollection?: boolean;
}

/**
 * Renders quiz embeds in preview mode
 * If quizId is provided, renders that quiz directly
 * Otherwise, scans for quiz divs in content and replaces them with React components
 */
export function QuizRenderer({
  quizId,
  skipInlineScan = false,
  showDescription = true,
  showResponsesButton = false,
  showResponsesPreview = false,
  skipContactCollection = false,
}: QuizRendererProps = {}) {
  // Scan for inline quizzes in content (only if not skipping and no direct quizId)
  useEffect(() => {
    // If quizId is provided or skipInlineScan is true, don't scan
    if (quizId && typeof quizId === "string" && quizId.trim() !== "") {
      return;
    }
    if (skipInlineScan) {
      return;
    }
    const renderQuizzes = () => {
      // Find all quiz wrapper divs
      const quizWrappers = document.querySelectorAll(
        '.preview-content div[data-type="quiz"]'
      );

      quizWrappers.forEach((wrapper) => {
        // Skip if already rendered
        if (wrapper.getAttribute("data-rendered") === "true") {
          return;
        }

        const inlineQuizId = wrapper.getAttribute("data-quiz-id");
        const align = (wrapper.getAttribute("data-align") || "center") as
          | "left"
          | "center"
          | "right";

        if (!inlineQuizId) {
          return;
        }

        // Mark as rendered
        wrapper.setAttribute("data-rendered", "true");

        // Create a container for the React component
        const container = document.createElement("div");
        container.className = "quiz-react-container";
        wrapper.innerHTML = "";
        wrapper.appendChild(container);

        // Render the QuizEmbed component
        const root = createRoot(container);
        root.render(<QuizEmbed quizId={inlineQuizId} align={align} />);
      });
    };

    // Initial render
    renderQuizzes();

    // Re-render when content changes (for dynamic content)
    const observer = new MutationObserver(() => {
      renderQuizzes();
    });

    const previewContent = document.querySelector(".preview-content");
    if (previewContent) {
      observer.observe(previewContent, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [quizId, skipInlineScan]);

  // If quizId is provided, render it directly (don't scan for inline quizzes)
  if (quizId && typeof quizId === "string" && quizId.trim() !== "") {
    return (
      <QuizEmbed
        quizId={quizId}
        align="center"
        showDescription={showDescription}
        showResponsesButton={showResponsesButton}
        showResponsesPreview={showResponsesPreview}
        skipContactCollection={skipContactCollection}
      />
    );
  }

  // If skipInlineScan is true, don't render anything
  if (skipInlineScan) {
    return null;
  }

  return null;
}
