import { useState, useEffect } from "react";
import { X, Loader2, ClipboardList } from "lucide-react";
import { quizzesApi } from "@/services/quizzes";
import type { Quiz } from "@/types/quiz";

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (quizId: string) => void;
}

export function QuizModal({ isOpen, onClose, onSelect }: QuizModalProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadQuizzes();
    }
  }, [isOpen]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await quizzesApi.getAll();
      setQuizzes(data);
    } catch (err) {
      console.error("Error loading quizzes:", err);
      setError(err instanceof Error ? err.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (quizId: string) => {
    onSelect(quizId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Select a Quiz</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadQuizzes}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">No quizzes found</p>
              <p className="text-sm text-gray-500">
                Create a quiz first to embed it in your post
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  onClick={() => handleSelect(quiz.id)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {quiz.title}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{quiz.questions.length} questions</span>
                        <span>•</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            quiz.status === "published"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {quiz.status}
                        </span>
                      </div>
                    </div>
                    <ClipboardList size={20} className="text-violet-600 ml-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
