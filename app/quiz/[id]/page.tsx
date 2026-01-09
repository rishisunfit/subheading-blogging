"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Quiz } from "@/types/quiz";
import { quizzesApi } from "@/services/quizzes";
import { QuizPlayer } from "@/components/quiz";
import { Loader2 } from "lucide-react";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const quizId = params.id as string;
        const loadedQuiz = await quizzesApi.getById(quizId);

        if (!loadedQuiz) {
          setError("Quiz not found");
        } else {
          setQuiz(loadedQuiz);
        }
      } catch (err) {
        setError("Failed to load quiz");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-600" />
          <p className="text-stone-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">😕</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">
            {error || "Quiz not found"}
          </h1>
          <p className="text-stone-600 mb-6">
            The quiz you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizPlayer
      quiz={quiz}
      onComplete={(submission) => {
        console.log("Quiz completed:", submission);
      }}
    />
  );
}
