"use client";

import { useState, useCallback, useEffect } from "react";
import { Quiz, QuizAnswer, QuizSubmission } from "@/types/quiz";
import { QuizCover } from "./QuizCover";
import { QuizCard } from "./QuizCard";
import { QuizContactForm } from "./QuizContactForm";
import { QuizConclusion } from "./QuizConclusion";
import { QuizProgressSimple } from "./QuizProgress";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { quizzesApi } from "@/services/quizzes";

interface QuizPlayerProps {
  quiz: Quiz;
  onComplete?: (submission: QuizSubmission) => void;
  onClose?: () => void;
  showResponsesPreview?: boolean;
  skipContactCollection?: boolean;
  showDescription?: boolean;
  showResponsesButton?: boolean;
}

type QuizStage = "cover" | "questions" | "contact" | "conclusion";

export function QuizPlayer({
  quiz,
  onComplete,
  onClose,
  showResponsesPreview,
  skipContactCollection,
  showDescription = true,
  showResponsesButton,
}: QuizPlayerProps) {
  const [stage, setStage] = useState<QuizStage>("cover");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [contactInfo, setContactInfo] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>();
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "left"
  );
  const [hasPriorCompletion, setHasPriorCompletion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(`quiz_data_${quiz.id}`);
      const legacy = localStorage.getItem(`quiz_completed_${quiz.id}`);
      if (data || legacy) {
        setHasPriorCompletion(true);
      }
    }
  }, [quiz.id]);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  // Check if current question is answered (for required questions)
  const isCurrentAnswered =
    currentQuestion &&
    (!currentQuestion.required ||
      (currentAnswer &&
        (Array.isArray(currentAnswer.value)
          ? currentAnswer.value.length > 0
          : currentAnswer.value !== undefined && currentAnswer.value !== "")));

  const getBorderRadius = () => {
    switch (quiz.styles.borderRadius) {
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

  const animateTransition = useCallback(
    (direction: "left" | "right", callback: () => void) => {
      setSlideDirection(direction);
      setIsAnimating(true);
      setTimeout(() => {
        callback();
        setIsAnimating(false);
      }, 200);
    },
    []
  );

  const handleStart = () => {
    // Reset answers if starting fresh? 
    // For now, keeping existing behavior (which keeps answers if they exist in state).
    // If we want to clear previous session when starting NEW, we should setAnswers({}) here.
    // However, if we just loaded from localStorage, maybe we want to keep them?
    // Let's assume Start = Retake, so verify if we want to clear.
    // Given 'Show Results' is separate, Start likely means Retake.
    setAnswers({});
    animateTransition("left", () => setStage("questions"));
  };

  const handleShowResults = () => {
    if (typeof window !== "undefined") {
      const dataStr = localStorage.getItem(`quiz_data_${quiz.id}`);
      if (dataStr) {
        try {
          const data = JSON.parse(dataStr);
          if (data.answers) {
            setAnswers(data.answers);
          }
        } catch (e) {
          console.error("Failed to parse quiz data", e);
        }
      }
    }
    animateTransition("left", () => setStage("conclusion"));
  };

  const handleAnswer = (answer: QuizAnswer) => {
    setAnswers((prev) => ({
      ...prev,
      [answer.questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (!isCurrentAnswered) return;

    if (isLastQuestion) {
      // Move to contact or conclusion
      animateTransition("left", () => {
        if (
          !skipContactCollection &&
          quiz.contactSettings.enabled &&
          quiz.contactSettings.position === "before_conclusion"
        ) {
          setStage("contact");
        } else {
          handleComplete();
          setStage("conclusion");
        }
      });
    } else {
      animateTransition("left", () => {
        setCurrentQuestionIndex((prev) => prev + 1);
      });
    }
  };

  const handleBack = () => {
    if (isFirstQuestion) {
      animateTransition("right", () => setStage("cover"));
    } else {
      animateTransition("right", () => {
        setCurrentQuestionIndex((prev) => prev - 1);
      });
    }
  };

  const handleContactSubmit = (info: {
    name?: string;
    email?: string;
    phone?: string;
  }) => {
    setContactInfo(info);
    animateTransition("left", () => {
      handleComplete(info);
      setStage("conclusion");
    });
  };

  const handleContactSkip = () => {
    animateTransition("left", () => {
      handleComplete();
      setStage("conclusion");
    });
  };

  const handleComplete = async (info?: {
    name?: string;
    email?: string;
    phone?: string;
  }) => {
    const submission = await quizzesApi.submitQuiz({
      quizId: quiz.id,
      answers: Object.values(answers),
      contactInfo: info || contactInfo,
    });

    if (typeof window !== "undefined") {
      // Save full state for results viewing
      const storedData = {
        completed: true,
        answers: answers,
        score: submission.score,
        submissionId: submission.id,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`quiz_data_${quiz.id}`, JSON.stringify(storedData));

      // Also set legacy key just in case other things use it
      localStorage.setItem(`quiz_completed_${quiz.id}`, "true");
      setHasPriorCompletion(true);
    }

    if (onComplete) {
      onComplete(submission);
    }
  };

  // Animation classes
  const getAnimationClass = () => {
    if (!isAnimating) return "translate-x-0 opacity-100";
    return slideDirection === "left"
      ? "-translate-x-8 opacity-0"
      : "translate-x-8 opacity-0";
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundColor: quiz.styles.backgroundColor,
        fontFamily: quiz.styles.fontFamily,
      }}
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(${quiz.styles.secondaryColor} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full transition-all duration-200 hover:bg-black/5"
          style={{ color: quiz.styles.textColor }}
        >
          <X size={24} />
        </button>
      )}

      {/* Progress Bar (only during questions) */}
      {stage === "questions" && (
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-40">
          <div className="max-w-2xl mx-auto">
            <QuizProgressSimple
              current={currentQuestionIndex + 1}
              total={quiz.questions.length}
              primaryColor={quiz.styles.secondaryColor}
              backgroundColor={quiz.styles.backgroundColor}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`relative z-10 transition-all duration-200 ease-out ${getAnimationClass()}`}
      >
        {/* Cover Page */}
        {stage === "cover" && (
          <QuizCover
            cover={quiz.coverPage}
            styles={quiz.styles}
            onStart={handleStart}
            showDescription={showDescription}
            showResponsesButton={showResponsesButton}
            skipContactCollection={skipContactCollection}
            hasPriorCompletion={hasPriorCompletion}
            onShowResults={handleShowResults}
          />
        )}

        {/* Question Cards */}
        {stage === "questions" && currentQuestion && (
          <div className="min-h-screen flex flex-col pt-20 pb-32 px-4">
            <div className="flex-1 flex items-center justify-center">
              <QuizCard
                question={currentQuestion}
                styles={quiz.styles}
                answer={currentAnswer}
                onAnswer={handleAnswer}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={quiz.questions.length}
              />
            </div>
          </div>
        )}

        {/* Contact Form */}
        {stage === "contact" && (
          <QuizContactForm
            settings={quiz.contactSettings}
            styles={quiz.styles}
            onSubmit={handleContactSubmit}
            onSkip={handleContactSkip}
          />
        )}

        {/* Conclusion */}
        {stage === "conclusion" && (
          <QuizConclusion
            conclusion={quiz.conclusionPage}
            styles={quiz.styles}
            questions={quiz.questions}
            answers={answers}
            contactInfo={contactInfo}
          />
        )}
      </div>

      {/* Navigation (only during questions) */}
      {stage === "questions" && (
        <div
          className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-40"
          style={{
            background: `linear-gradient(to top, ${quiz.styles.backgroundColor}, ${quiz.styles.backgroundColor}ee, transparent)`,
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="px-5 py-3 font-medium transition-all duration-200 flex items-center gap-2 hover:gap-3"
              style={{
                color: quiz.styles.textColor,
                opacity: 0.7,
              }}
            >
              <ArrowLeft size={18} />
              Back
            </button>

            {/* Next/Finish Button */}
            <button
              onClick={handleNext}
              disabled={!isCurrentAnswered}
              className="px-6 py-3 font-semibold transition-all duration-200 flex items-center gap-2 hover:gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isCurrentAnswered
                  ? quiz.styles.primaryColor
                  : `${quiz.styles.primaryColor}60`,
                color: "#ffffff",
                borderRadius: getBorderRadius(),
              }}
            >
              {isLastQuestion ? "Finish" : "Next"}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
