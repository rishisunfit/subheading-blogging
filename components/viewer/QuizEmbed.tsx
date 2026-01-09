"use client";

import { useState, useEffect } from "react";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { quizzesApi } from "@/services/quizzes";
import type { Quiz } from "@/types/quiz";
import { Loader2 } from "lucide-react";

interface QuizEmbedProps {
  quizId: string;
  align?: "left" | "center" | "right";
  showResponsesPreview?: boolean;
  skipContactCollection?: boolean;
  showDescription?: boolean;
  showResponsesButton?: boolean;
}

export function QuizEmbed({
  quizId,
  align = "center",
  showResponsesPreview = false,
  skipContactCollection = false,
  showDescription = true,
  showResponsesButton = false,
}: QuizEmbedProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) {
        setError("No quiz ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1. Try public fetch by ID (most common case for public viewers)
        let quizData = await quizzesApi.getPublicById(quizId);

        // 2. If not found, try by slug
        if (!quizData) {
          quizData = await quizzesApi.getBySlug(quizId);
        }

        // 3. If still not found, try authenticated fetch (for previewing drafts)
        if (!quizData) {
          try {
            // This will throw if not logged in, which we catch and ignore
            quizData = await quizzesApi.getById(quizId);
          } catch {
            // Check auth failed or not found, just ignore and leave quizData as null
          }
        }

        if (quizData) {
          setQuiz(quizData);
        } else {
          setError("Quiz not found");
        }
      } catch (err) {
        console.error("Error loading quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId]);

  if (loading) {
    return (
      <div
        className="my-8 flex justify-center"
        data-type="quiz"
        data-quiz-id={quizId}
        data-align={align}
      >
        <div className="w-full max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center w-full">
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin text-gray-400" />
              <span className="text-gray-600">Loading quiz...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div
        className="my-8 flex justify-center"
        data-type="quiz"
        data-quiz-id={quizId}
        data-align={align}
      >
        <div className="w-full max-w-2xl">
          <div className="bg-white border border-red-200 rounded-lg shadow-sm p-6 text-center w-full">
            <p className="text-red-600 text-sm">{error || "Quiz not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const alignClass =
    align === "left"
      ? "items-start"
      : align === "right"
        ? "items-end"
        : "items-center";

  return (
    <div
      className="my-8 flex justify-center"
      data-type="quiz"
      data-quiz-id={quizId}
      data-align={align}
    >
      <div className={`w-full max-w-2xl flex ${alignClass}`}>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden w-full">
          <QuizPlayer
            quiz={quiz}
            showResponsesPreview={showResponsesPreview}
            skipContactCollection={skipContactCollection}
            showDescription={showDescription}
            showResponsesButton={showResponsesButton}
          />
        </div>
      </div>
    </div>
  );
}
