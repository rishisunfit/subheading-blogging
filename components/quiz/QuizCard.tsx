"use client";

import { useState } from "react";
import { QuizQuestion, QuizStyles, QuizAnswer } from "@/types/quiz";
import { Check, Star } from "lucide-react";

interface QuizCardProps {
  question: QuizQuestion;
  styles: QuizStyles;
  answer?: QuizAnswer;
  onAnswer: (answer: QuizAnswer) => void;
  questionNumber: number;
  totalQuestions: number;
}

export function QuizCard({
  question,
  styles,
  answer,
  onAnswer,
  questionNumber,
  totalQuestions,
}: QuizCardProps) {
  const [textValue, setTextValue] = useState((answer?.value as string) || "");

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

  const handleOptionClick = (optionId: string) => {
    if (question.type === "multiple_choice") {
      const currentValues = (answer?.value as string[]) || [];
      const newValues = currentValues.includes(optionId)
        ? currentValues.filter((v) => v !== optionId)
        : [...currentValues, optionId];
      onAnswer({ questionId: question.id, value: newValues });
    } else {
      onAnswer({ questionId: question.id, value: optionId });
    }
  };

  const handleTextChange = (value: string) => {
    setTextValue(value);
    onAnswer({ questionId: question.id, value });
  };

  const handleRatingClick = (rating: number) => {
    onAnswer({ questionId: question.id, value: rating });
  };

  const isSelected = (optionId: string) => {
    if (!answer) return false;
    if (question.type === "multiple_choice") {
      return (answer.value as string[])?.includes(optionId);
    }
    return answer.value === optionId;
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto"
      style={{ fontFamily: styles.fontFamily }}
    >
      {/* Question Number Badge */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6"
        style={{
          backgroundColor: `${styles.secondaryColor}15`,
          color: styles.secondaryColor,
        }}
      >
        <span>
          {questionNumber} / {totalQuestions}
        </span>
        {question.required && <span className="text-xs">Required</span>}
      </div>

      {/* Question Text */}
      <h2
        className="text-2xl md:text-3xl font-bold mb-3 leading-tight"
        style={{ color: styles.textColor }}
      >
        {question.question}
      </h2>

      {/* Description */}
      {question.description && (
        <p
          className="text-base md:text-lg mb-8 opacity-70"
          style={{ color: styles.textColor }}
        >
          {question.description}
        </p>
      )}

      {/* Answer Options */}
      <div className="mt-8 space-y-3">
        {/* Single/Multiple Choice */}
        {(question.type === "single_choice" ||
          question.type === "multiple_choice") &&
          question.options?.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className="w-full text-left p-4 md:p-5 transition-all duration-200 group relative overflow-hidden"
              style={{
                backgroundColor: isSelected(option.id)
                  ? `${styles.secondaryColor}12`
                  : styles.cardBackgroundColor,
                borderRadius: getBorderRadius(),
                border: `2px solid ${
                  isSelected(option.id)
                    ? styles.secondaryColor
                    : `${styles.textColor}15`
                }`,
                color: styles.textColor,
              }}
            >
              <div className="flex items-center gap-4">
                {/* Option Letter */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: isSelected(option.id)
                      ? styles.secondaryColor
                      : `${styles.textColor}10`,
                    color: isSelected(option.id) ? "#ffffff" : styles.textColor,
                  }}
                >
                  {isSelected(option.id) ? (
                    <Check size={18} strokeWidth={3} />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>

                {/* Option Text */}
                <span className="text-base md:text-lg font-medium">
                  {option.text}
                </span>
              </div>
            </button>
          ))}

        {/* Text Input */}
        {(question.type === "text" ||
          question.type === "email" ||
          question.type === "phone") && (
          <div className="relative">
            {question.type === "text" ? (
              <textarea
                value={textValue}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={question.placeholder || "Type your answer..."}
                rows={4}
                className="w-full p-4 md:p-5 transition-all duration-200 resize-none focus:outline-none"
                style={{
                  backgroundColor: styles.cardBackgroundColor,
                  borderRadius: getBorderRadius(),
                  border: `2px solid ${
                    textValue ? styles.secondaryColor : `${styles.textColor}15`
                  }`,
                  color: styles.textColor,
                  fontFamily: styles.fontFamily,
                }}
              />
            ) : (
              <input
                type={question.type}
                value={textValue}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={
                  question.placeholder ||
                  (question.type === "email"
                    ? "email@example.com"
                    : "(555) 123-4567")
                }
                className="w-full p-4 md:p-5 transition-all duration-200 focus:outline-none"
                style={{
                  backgroundColor: styles.cardBackgroundColor,
                  borderRadius: getBorderRadius(),
                  border: `2px solid ${
                    textValue ? styles.secondaryColor : `${styles.textColor}15`
                  }`,
                  color: styles.textColor,
                  fontFamily: styles.fontFamily,
                }}
              />
            )}
          </div>
        )}

        {/* Rating */}
        {question.type === "rating" && (
          <div className="flex justify-center gap-2 md:gap-4 py-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRatingClick(rating)}
                className="p-3 md:p-4 transition-all duration-200 hover:scale-110"
                style={{
                  color:
                    (answer?.value as number) >= rating
                      ? "#f59e0b"
                      : `${styles.textColor}30`,
                }}
              >
                <Star
                  size={36}
                  fill={
                    (answer?.value as number) >= rating
                      ? "currentColor"
                      : "none"
                  }
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
