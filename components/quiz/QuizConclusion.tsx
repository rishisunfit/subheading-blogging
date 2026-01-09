"use client";

import { useState } from "react";
import {
  QuizConclusionPage,
  QuizStyles,
  QuizQuestion,
  QuizAnswer,
} from "@/types/quiz";
import { CheckCircle2, Send, Sparkles } from "lucide-react";

interface QuizConclusionProps {
  conclusion: QuizConclusionPage;
  styles: QuizStyles;
  questions?: QuizQuestion[];
  answers?: Record<string, QuizAnswer>;
  contactInfo?: { name?: string; email?: string; phone?: string };
}

export function QuizConclusion({
  conclusion,
  styles,
  questions = [],
  answers = {},
}: QuizConclusionProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

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

  const getAnswerText = (
    question: QuizQuestion,
    answer: QuizAnswer | undefined
  ): string => {
    if (!answer) return "Not answered";

    if (question.type === "rating") {
      return `${answer.value} out of 5 stars`;
    }

    if (
      question.type === "text" ||
      question.type === "email" ||
      question.type === "phone"
    ) {
      return (answer.value as string) || "Not provided";
    }

    if (question.type === "multiple_choice") {
      const selectedIds = answer.value as string[];
      const selectedOptions =
        question.options?.filter((o) => selectedIds.includes(o.id)) || [];
      return selectedOptions.map((o) => o.text).join(", ") || "None selected";
    }

    // Single choice
    const selectedOption = question.options?.find((o) => o.id === answer.value);
    return selectedOption?.text || "Not answered";
  };

  const handleSendToRish = async () => {
    setIsSending(true);
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSending(false);
    setIsSent(true);
  };

  const handleGetAIResults = async () => {
    setIsGeneratingAI(true);
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGeneratingAI(false);
    setAiGenerated(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col px-4 md:px-6 py-12"
      style={{ fontFamily: styles.fontFamily }}
    >
      <div className="max-w-2xl mx-auto w-full">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto"
            style={{
              backgroundColor: `${styles.secondaryColor}12`,
              color: styles.secondaryColor,
            }}
          >
            <CheckCircle2 size={32} strokeWidth={1.5} />
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ color: styles.textColor }}
          >
            {conclusion.title}
          </h1>

          {conclusion.subtitle && (
            <p
              className="text-base md:text-lg opacity-70"
              style={{ color: styles.textColor }}
            >
              {conclusion.subtitle}
            </p>
          )}
        </div>

        {/* Response Summary - Always Expanded */}
        {questions.length > 0 && (
          <div
            className="mb-8"
            style={{
              backgroundColor: styles.cardBackgroundColor,
              borderRadius: getBorderRadius(),
              border: `1px solid ${styles.textColor}08`,
              overflow: "hidden",
            }}
          >
            <div
              className="p-6 border-b"
              style={{ borderColor: `${styles.textColor}08` }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: styles.textColor }}
              >
                Your Response Summary
              </h2>
            </div>

            {/* Full Summary - Always Visible */}
            <div className="p-6 space-y-5 max-h-[28rem] overflow-y-auto">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="pb-5 border-b last:border-0 last:pb-0"
                  style={{ borderColor: `${styles.textColor}08` }}
                >
                  <div className="flex gap-4">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                      style={{
                        backgroundColor: `${styles.secondaryColor}12`,
                        color: styles.secondaryColor,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-sm font-medium mb-1"
                        style={{ color: styles.textColor }}
                      >
                        {question.question}
                      </p>
                      <div
                        className="text-sm px-3 py-2 rounded-lg inline-block"
                        style={{
                          backgroundColor: `${styles.secondaryColor}08`,
                          color: styles.textColor,
                        }}
                      >
                        {getAnswerText(question, answers[question.id])}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Results Option */}
        <div
          className="p-6 text-center mb-4"
          style={{
            backgroundColor: styles.cardBackgroundColor,
            borderRadius: getBorderRadius(),
            border: `1px solid ${styles.textColor}08`,
          }}
        >
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: styles.textColor }}
          >
            Instant AI Analysis
          </h3>
          <p
            className="text-sm opacity-70 mb-6 max-w-md mx-auto"
            style={{ color: styles.textColor }}
          >
            Get immediate insights powered by Rish AI based on your assessment
            responses.
          </p>

          {!aiGenerated ? (
            <button
              onClick={handleGetAIResults}
              disabled={isGeneratingAI}
              className="w-full max-w-sm mx-auto px-8 py-4 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70"
              style={{
                backgroundColor: styles.secondaryColor,
                color: "#ffffff",
                borderRadius: getBorderRadius(),
              }}
            >
              {isGeneratingAI ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Get Results from Rish AI
                </>
              )}
            </button>
          ) : (
            <div
              className="w-full max-w-sm mx-auto px-8 py-4 text-base font-semibold flex items-center justify-center gap-3"
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                borderRadius: getBorderRadius(),
              }}
            >
              <CheckCircle2 size={18} />
              AI Analysis Ready
            </div>
          )}

          {aiGenerated && (
            <p
              className="text-sm opacity-60 mt-4"
              style={{ color: styles.textColor }}
            >
              Check your email for your personalized AI analysis.
            </p>
          )}
        </div>

        {/* Main CTA - Build My Custom Knee Plan */}
        <div
          className="p-6 text-center"
          style={{
            backgroundColor: styles.cardBackgroundColor,
            borderRadius: getBorderRadius(),
            border: `1px solid ${styles.textColor}08`,
          }}
        >
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: styles.textColor }}
          >
            Ready for Expert Review
          </h3>
          <p
            className="text-sm opacity-70 mb-6 max-w-md mx-auto"
            style={{ color: styles.textColor }}
          >
            I'll take a look at your results and send over my specific
            recommendations for your situation.
          </p>

          {!isSent ? (
            <button
              onClick={handleSendToRish}
              disabled={isSending}
              className="w-full max-w-sm mx-auto px-8 py-4 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70"
              style={{
                backgroundColor: styles.primaryColor,
                color: "#ffffff",
                borderRadius: getBorderRadius(),
              }}
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Build My Custom Knee Plan
                </>
              )}
            </button>
          ) : (
            <div
              className="w-full max-w-sm mx-auto px-8 py-4 text-base font-semibold flex items-center justify-center gap-3"
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                borderRadius: getBorderRadius(),
              }}
            >
              <CheckCircle2 size={18} />
              Sent Successfully
            </div>
          )}

          {isSent && (
            <p
              className="text-sm opacity-60 mt-4"
              style={{ color: styles.textColor }}
            >
              I'll get back to you within 24-48 hours with your personalized
              plan.
            </p>
          )}
        </div>

        {/* Secondary CTAs */}
        {conclusion.ctaButtons && conclusion.ctaButtons.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {conclusion.ctaButtons.map((button) => {
              // Map specific button texts to URLs
              let buttonUrl = button.url;
              if (!buttonUrl) {
                if (
                  button.text === "Get Your Personalized Plan" ||
                  button.text.includes("Personalized Plan")
                ) {
                  buttonUrl = "https://rishfits.ptflow.io/";
                } else if (
                  button.text === "Book a Consultation" ||
                  button.text.includes("Consultation")
                ) {
                  buttonUrl = "https://rishfits.ptflow.io/discovery";
                } else {
                  buttonUrl = "#";
                }
              }

              return (
                <a
                  key={button.id}
                  href={buttonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-80"
                  style={{
                    backgroundColor: "transparent",
                    color: styles.textColor,
                    borderRadius: getBorderRadius(),
                    border: `1px solid ${styles.textColor}20`,
                  }}
                >
                  {button.text}
                </a>
              );
            })}
          </div>
        )}

        {/* Authority Footer */}
        <div
          className="mt-12 pt-8 border-t text-center"
          style={{ borderColor: `${styles.textColor}10` }}
        >
          <p className="text-xs opacity-40" style={{ color: styles.textColor }}>
            This assessment is designed to help identify patterns in knee
            discomfort.
            <br />
            It is not a substitute for professional medical diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
}
