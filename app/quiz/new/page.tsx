"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Quiz } from "@/types/quiz";
import { quizzesApi, createBlankQuiz } from "@/services/quizzes";
import { QuizBuilder, QuizPlayer } from "@/components/quiz";
import { useDialog } from "@/hooks/useDialog";

export default function NewQuizPage() {
  const router = useRouter();
  const { showDialog } = useDialog();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<Omit<
    Quiz,
    "id" | "createdAt" | "updatedAt" | "userId"
  > | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSave = async (
    quizData: Omit<Quiz, "id" | "createdAt" | "updatedAt" | "userId">
  ) => {
    try {
      // Save quiz to Supabase
      const newQuiz = await quizzesApi.create(quizData);

      // Show success message
      showDialog({
        type: "alert",
        title: "Quiz Saved",
        message: "Your quiz has been successfully saved to Supabase.",
      });

      // Navigate to edit page
      router.push(`/quiz/${newQuiz.id}/edit`);
    } catch (error) {
      console.error("Failed to save quiz to Supabase:", error);

      // Show detailed error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while saving the quiz.";

      showDialog({
        type: "alert",
        title: "Failed to Save Quiz",
        message: `Unable to save quiz to Supabase: ${errorMessage}. Please check your connection and try again.`,
      });
    }

    const handlePreview = (
      quizData: Omit<Quiz, "id" | "createdAt" | "updatedAt" | "userId">
    ) => {
      setPreviewQuiz(quizData);
      setIsPreviewMode(true);
    };

    const handleBack = () => {
      router.push("/dashboard");
    };

    if (isPreviewMode && previewQuiz) {
      return (
        <QuizPlayer
          quiz={{
            ...previewQuiz,
            id: "preview",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: "preview-user",
          }}
          onClose={() => setIsPreviewMode(false)}
        />
      );
    }

    return (
      <QuizBuilder
        initialQuiz={createBlankQuiz()}
        onSave={handleSave}
        onPreview={handlePreview}
        onBack={handleBack}
      />
    );
  };
}
