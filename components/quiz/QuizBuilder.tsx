"use client";

import { useState, useCallback } from "react";
import {
  Quiz,
  QuizQuestion,
  QuizOption,
  QuizStyles,
  defaultQuizStyles,
  defaultContactSettings,
} from "@/types/quiz";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  Eye,
  Save,
  Settings,
  Type,
  ListChecks,
  Star,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Palette,
  FileText,
  MessageSquare,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface QuizBuilderProps {
  initialQuiz?: Partial<Quiz>;
  onSave: (
    quiz: Omit<Quiz, "id" | "createdAt" | "updatedAt" | "userId">
  ) => void;
  onPreview: (
    quiz: Omit<Quiz, "id" | "createdAt" | "updatedAt" | "userId">
  ) => void;
  onBack: () => void;
}

type BuilderTab = "content" | "design" | "settings";

const questionTypeIcons = {
  single_choice: ListChecks,
  multiple_choice: ListChecks,
  text: Type,
  rating: Star,
  email: Mail,
  phone: Phone,
};

const questionTypeLabels = {
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  text: "Text Input",
  rating: "Rating (1-5)",
  email: "Email",
  phone: "Phone",
};

// Helper to generate UUID
const generateId = (): string => {
  return (
    crypto.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );
};

export function QuizBuilder({
  initialQuiz,
  onSave,
  onPreview,
  onBack,
}: QuizBuilderProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("content");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );
  const [previewStep, setPreviewStep] = useState<
    "cover" | "question" | "conclusion"
  >("cover");
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);

  // Quiz state
  const [title, setTitle] = useState(initialQuiz?.title || "Untitled Quiz");
  const [coverPage, setCoverPage] = useState(
    initialQuiz?.coverPage || {
      title: "Welcome to the Quiz",
      subtitle: "",
      description: "",
      buttonText: "Start Quiz",
    }
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuiz?.questions || [
      {
        id: generateId(),
        type: "single_choice",
        question: "Your first question here...",
        options: [
          { id: generateId(), text: "Option A" },
          { id: generateId(), text: "Option B" },
          { id: generateId(), text: "Option C" },
        ],
        required: true,
      },
    ]
  );
  const [conclusionPage, setConclusionPage] = useState(
    initialQuiz?.conclusionPage || {
      title: "Thanks for completing the quiz!",
      subtitle: "",
      description: "",
      ctaButtons: [
        { id: generateId(), text: "Learn More", style: "primary" as const },
      ],
    }
  );
  const [contactSettings, setContactSettings] = useState(
    initialQuiz?.contactSettings || defaultContactSettings
  );
  const [styles, setStyles] = useState<QuizStyles>(
    initialQuiz?.styles || defaultQuizStyles
  );

  const buildQuizObject = useCallback(
    (): Omit<Quiz, "id" | "createdAt" | "updatedAt" | "userId"> => ({
      title,
      coverPage,
      questions,
      conclusionPage,
      contactSettings,
      styles,
      status: "draft",
    }),
    [title, coverPage, questions, conclusionPage, contactSettings, styles]
  );

  const handleSave = () => {
    onSave(buildQuizObject());
  };

  const handlePreview = () => {
    onPreview(buildQuizObject());
  };

  // Question management
  const addQuestion = (type: QuizQuestion["type"] = "single_choice") => {
    const newQuestion: QuizQuestion = {
      id: generateId(),
      type,
      question: "New question...",
      required: true,
      options:
        type === "single_choice" || type === "multiple_choice"
          ? [
              { id: generateId(), text: "Option A" },
              { id: generateId(), text: "Option B" },
            ]
          : undefined,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestionId(newQuestion.id);
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
    if (expandedQuestionId === id) {
      setExpandedQuestionId(null);
    }
  };

  const moveQuestion = (id: string, direction: "up" | "down") => {
    const index = questions.findIndex((q) => q.id === id);
    if (direction === "up" && index > 0) {
      const newQuestions = [...questions];
      [newQuestions[index - 1], newQuestions[index]] = [
        newQuestions[index],
        newQuestions[index - 1],
      ];
      setQuestions(newQuestions);
    } else if (direction === "down" && index < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index + 1]] = [
        newQuestions[index + 1],
        newQuestions[index],
      ];
      setQuestions(newQuestions);
    }
  };

  // Option management
  const addOption = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOption: QuizOption = {
      id: generateId(),
      text: `Option ${String.fromCharCode(
        65 + (question.options?.length || 0)
      )}`,
    };

    updateQuestion(questionId, {
      options: [...(question.options || []), newOption],
    });
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    updateQuestion(questionId, {
      options: question.options?.map((o) =>
        o.id === optionId ? { ...o, text } : o
      ),
    });
  };

  const deleteOption = (questionId: string, optionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || (question.options?.length || 0) <= 2) return;

    updateQuestion(questionId, {
      options: question.options?.filter((o) => o.id !== optionId),
    });
  };

  // CTA button management
  const addCtaButton = () => {
    setConclusionPage({
      ...conclusionPage,
      ctaButtons: [
        ...(conclusionPage.ctaButtons || []),
        { id: generateId(), text: "New Button", style: "secondary" },
      ],
    });
  };

  const updateCtaButton = (
    id: string,
    updates: Partial<{
      text: string;
      url: string;
      style: "primary" | "secondary" | "outline";
    }>
  ) => {
    setConclusionPage({
      ...conclusionPage,
      ctaButtons: conclusionPage.ctaButtons?.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    });
  };

  const deleteCtaButton = (id: string) => {
    setConclusionPage({
      ...conclusionPage,
      ctaButtons: conclusionPage.ctaButtons?.filter((b) => b.id !== id),
    });
  };

  const getBorderRadius = (radius: QuizStyles["borderRadius"]) => {
    switch (radius) {
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

  // Preview component
  const renderPreview = () => {
    const currentQuestion = questions[previewQuestionIndex];

    return (
      <div
        className="h-full flex flex-col"
        style={{
          backgroundColor: styles.backgroundColor,
          fontFamily: styles.fontFamily,
        }}
      >
        {/* Preview Header */}
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: `${styles.textColor}10` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: styles.secondaryColor }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: styles.textColor }}
            >
              Live Preview
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (previewStep === "question" && previewQuestionIndex > 0) {
                  setPreviewQuestionIndex(previewQuestionIndex - 1);
                } else if (
                  previewStep === "question" &&
                  previewQuestionIndex === 0
                ) {
                  setPreviewStep("cover");
                } else if (previewStep === "conclusion") {
                  setPreviewStep("question");
                  setPreviewQuestionIndex(questions.length - 1);
                }
              }}
              disabled={previewStep === "cover"}
              className="p-1.5 rounded hover:bg-black/5 disabled:opacity-30"
            >
              <ArrowLeft size={14} style={{ color: styles.textColor }} />
            </button>
            <button
              onClick={() => {
                if (previewStep === "cover") {
                  setPreviewStep("question");
                  setPreviewQuestionIndex(0);
                } else if (
                  previewStep === "question" &&
                  previewQuestionIndex < questions.length - 1
                ) {
                  setPreviewQuestionIndex(previewQuestionIndex + 1);
                } else if (
                  previewStep === "question" &&
                  previewQuestionIndex === questions.length - 1
                ) {
                  setPreviewStep("conclusion");
                }
              }}
              disabled={previewStep === "conclusion"}
              className="p-1.5 rounded hover:bg-black/5 disabled:opacity-30"
            >
              <ArrowRight size={14} style={{ color: styles.textColor }} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
          {/* Cover Preview */}
          {previewStep === "cover" && (
            <div className="text-center max-w-md">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
                style={{ backgroundColor: `${styles.secondaryColor}15` }}
              >
                <Sparkles size={24} style={{ color: styles.secondaryColor }} />
              </div>
              <p
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: styles.secondaryColor }}
              >
                {coverPage.subtitle || "Quiz subtitle"}
              </p>
              <h2
                className="text-2xl font-bold mb-3"
                style={{ color: styles.textColor }}
              >
                {coverPage.title || "Quiz Title"}
              </h2>
              <p
                className="text-sm opacity-70 mb-6"
                style={{ color: styles.textColor }}
              >
                {coverPage.description || "Add a description..."}
              </p>
              <button
                className="px-6 py-3 text-sm font-semibold text-white flex items-center gap-2 mx-auto"
                style={{
                  backgroundColor: styles.primaryColor,
                  borderRadius: getBorderRadius(styles.borderRadius),
                }}
              >
                {coverPage.buttonText || "Start"}
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Question Preview */}
          {previewStep === "question" && currentQuestion && (
            <div className="w-full max-w-md">
              {/* Progress */}
              <div
                className="flex items-center justify-between mb-4 text-xs"
                style={{ color: styles.textColor }}
              >
                <span className="opacity-60">
                  Question {previewQuestionIndex + 1} of {questions.length}
                </span>
                <span className="opacity-60">
                  {Math.round(
                    ((previewQuestionIndex + 1) / questions.length) * 100
                  )}
                  %
                </span>
              </div>
              <div
                className="h-1.5 rounded-full mb-6"
                style={{ backgroundColor: `${styles.secondaryColor}20` }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: styles.secondaryColor,
                    width: `${
                      ((previewQuestionIndex + 1) / questions.length) * 100
                    }%`,
                  }}
                />
              </div>

              {/* Question Card */}
              <div
                className="p-6"
                style={{
                  backgroundColor: styles.cardBackgroundColor,
                  borderRadius: getBorderRadius(styles.borderRadius),
                  border: `1px solid ${styles.textColor}08`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${styles.secondaryColor}15`,
                      color: styles.secondaryColor,
                    }}
                  >
                    {previewQuestionIndex + 1} / {questions.length}
                  </span>
                  {currentQuestion.required && (
                    <span
                      className="text-xs font-medium"
                      style={{ color: styles.secondaryColor }}
                    >
                      Required
                    </span>
                  )}
                </div>

                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: styles.textColor }}
                >
                  {currentQuestion.question}
                </h3>

                {currentQuestion.description && (
                  <p
                    className="text-sm opacity-60 mb-4"
                    style={{ color: styles.textColor }}
                  >
                    {currentQuestion.description}
                  </p>
                )}

                {/* Options */}
                {(currentQuestion.type === "single_choice" ||
                  currentQuestion.type === "multiple_choice") && (
                  <div className="space-y-2 mt-4">
                    {currentQuestion.options?.map((option, idx) => (
                      <div
                        key={option.id}
                        className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:border-blue-300"
                        style={{
                          backgroundColor: styles.cardBackgroundColor,
                          borderColor: `${styles.textColor}15`,
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                          style={{
                            backgroundColor: `${styles.secondaryColor}15`,
                            color: styles.secondaryColor,
                          }}
                        >
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span
                          className="text-sm"
                          style={{ color: styles.textColor }}
                        >
                          {option.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conclusion Preview */}
          {previewStep === "conclusion" && (
            <div className="text-center max-w-md">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-5 mx-auto"
                style={{ backgroundColor: `${styles.secondaryColor}15` }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={styles.secondaryColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: styles.textColor }}
              >
                {conclusionPage.title || "Assessment Complete"}
              </h2>
              {conclusionPage.subtitle && (
                <p
                  className="text-sm opacity-70 mb-4"
                  style={{ color: styles.textColor }}
                >
                  {conclusionPage.subtitle}
                </p>
              )}
              {conclusionPage.description && (
                <p
                  className="text-sm opacity-60 mb-6"
                  style={{ color: styles.textColor }}
                >
                  {conclusionPage.description}
                </p>
              )}
              <div className="flex flex-col gap-2">
                {conclusionPage.ctaButtons?.map((btn) => (
                  <button
                    key={btn.id}
                    className="px-6 py-3 text-sm font-semibold"
                    style={{
                      backgroundColor:
                        btn.style === "primary"
                          ? styles.primaryColor
                          : btn.style === "secondary"
                          ? styles.secondaryColor
                          : "transparent",
                      color:
                        btn.style === "outline" ? styles.textColor : "#fff",
                      borderRadius: getBorderRadius(styles.borderRadius),
                      border:
                        btn.style === "outline"
                          ? `1px solid ${styles.textColor}30`
                          : "none",
                    }}
                  >
                    {btn.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview Navigation Dots */}
        <div
          className="px-4 py-3 flex items-center justify-center gap-2 border-t"
          style={{ borderColor: `${styles.textColor}10` }}
        >
          <button
            onClick={() => setPreviewStep("cover")}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              backgroundColor:
                previewStep === "cover"
                  ? styles.secondaryColor
                  : `${styles.textColor}30`,
            }}
          />
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPreviewStep("question");
                setPreviewQuestionIndex(idx);
              }}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor:
                  previewStep === "question" && previewQuestionIndex === idx
                    ? styles.secondaryColor
                    : `${styles.textColor}30`,
              }}
            />
          ))}
          <button
            onClick={() => setPreviewStep("conclusion")}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              backgroundColor:
                previewStep === "conclusion"
                  ? styles.secondaryColor
                  : `${styles.textColor}30`,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: styles.backgroundColor }}
    >
      {/* Top Bar */}
      <div
        className="border-b flex-shrink-0"
        style={{
          backgroundColor: styles.cardBackgroundColor,
          borderColor: `${styles.textColor}10`,
        }}
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors flex-shrink-0 hover:bg-black/5"
                style={{ color: styles.textColor }}
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Back</span>
              </button>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quiz title..."
                className="flex-1 text-xl font-bold border-none outline-none focus:ring-0 bg-transparent min-w-0"
                style={{ color: styles.textColor }}
              />
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium hover:bg-black/5"
                style={{
                  color: styles.textColor,
                  borderColor: `${styles.textColor}20`,
                }}
              >
                <Eye size={18} />
                Preview
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                style={{ backgroundColor: styles.primaryColor }}
              >
                <Save size={18} />
                Save Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-1">
          {[
            { id: "content" as const, label: "Content", icon: FileText },
            { id: "design" as const, label: "Design", icon: Palette },
            { id: "settings" as const, label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor:
                  activeTab === tab.id ? styles.secondaryColor : "transparent",
                color:
                  activeTab === tab.id
                    ? styles.secondaryColor
                    : `${styles.textColor}60`,
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Content Tab */}
            {activeTab === "content" && (
              <>
                {/* Cover Page */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: styles.cardBackgroundColor,
                    border: `1px solid ${styles.textColor}10`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles
                      size={18}
                      style={{ color: styles.secondaryColor }}
                    />
                    <h3
                      className="font-semibold"
                      style={{ color: styles.textColor }}
                    >
                      Cover Page
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: `${styles.textColor}80` }}
                      >
                        Title
                      </label>
                      <input
                        type="text"
                        value={coverPage.title}
                        onChange={(e) =>
                          setCoverPage({ ...coverPage, title: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                        placeholder="Quiz title..."
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: `${styles.textColor}80` }}
                      >
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={coverPage.subtitle || ""}
                        onChange={(e) =>
                          setCoverPage({
                            ...coverPage,
                            subtitle: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                        placeholder="A short tagline..."
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: `${styles.textColor}80` }}
                      >
                        Description
                      </label>
                      <textarea
                        value={coverPage.description || ""}
                        onChange={(e) =>
                          setCoverPage({
                            ...coverPage,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none resize-none"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                        placeholder="What is this quiz about?"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: `${styles.textColor}80` }}
                      >
                        Start Button Text
                      </label>
                      <input
                        type="text"
                        value={coverPage.buttonText}
                        onChange={(e) =>
                          setCoverPage({
                            ...coverPage,
                            buttonText: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                        placeholder="Start Quiz"
                      />
                    </div>
                  </div>
                </div>

                {/* Questions */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: styles.cardBackgroundColor,
                    border: `1px solid ${styles.textColor}10`,
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare
                        size={18}
                        style={{ color: styles.secondaryColor }}
                      />
                      <h3
                        className="font-semibold"
                        style={{ color: styles.textColor }}
                      >
                        Questions
                      </h3>
                      <span
                        className="text-sm"
                        style={{ color: `${styles.textColor}60` }}
                      >
                        ({questions.length})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {questions.map((question, index) => {
                      const IconComponent = questionTypeIcons[question.type];
                      const isExpanded = expandedQuestionId === question.id;

                      return (
                        <div
                          key={question.id}
                          className="rounded-lg transition-all"
                          style={{
                            border: `1px solid ${
                              isExpanded
                                ? styles.secondaryColor
                                : `${styles.textColor}15`
                            }`,
                            backgroundColor: isExpanded
                              ? `${styles.secondaryColor}05`
                              : styles.cardBackgroundColor,
                          }}
                        >
                          {/* Question Header */}
                          <div
                            className="flex items-center gap-3 p-4 cursor-pointer"
                            onClick={() =>
                              setExpandedQuestionId(
                                isExpanded ? null : question.id
                              )
                            }
                          >
                            <GripVertical
                              size={16}
                              style={{ color: `${styles.textColor}40` }}
                            />
                            <span
                              className="text-sm font-medium flex-shrink-0"
                              style={{ color: `${styles.textColor}60` }}
                            >
                              Q{index + 1}
                            </span>
                            <IconComponent
                              size={16}
                              style={{ color: styles.secondaryColor }}
                            />
                            <span
                              className="flex-1 font-medium truncate"
                              style={{ color: styles.textColor }}
                            >
                              {question.question}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveQuestion(question.id, "up");
                                }}
                                disabled={index === 0}
                                className="p-1 disabled:opacity-30 hover:opacity-70"
                                style={{ color: `${styles.textColor}60` }}
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveQuestion(question.id, "down");
                                }}
                                disabled={index === questions.length - 1}
                                className="p-1 disabled:opacity-30 hover:opacity-70"
                                style={{ color: `${styles.textColor}60` }}
                              >
                                <ChevronDown size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteQuestion(question.id);
                                }}
                                className="p-1 hover:text-red-500"
                                style={{ color: `${styles.textColor}60` }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div
                              className="px-4 pb-4 space-y-4 border-t pt-4"
                              style={{ borderColor: `${styles.textColor}10` }}
                            >
                              {/* Question Type */}
                              <div>
                                <label
                                  className="block text-sm font-medium mb-1"
                                  style={{ color: `${styles.textColor}80` }}
                                >
                                  Question Type
                                </label>
                                <select
                                  value={question.type}
                                  onChange={(e) =>
                                    updateQuestion(question.id, {
                                      type: e.target
                                        .value as QuizQuestion["type"],
                                      options:
                                        e.target.value === "single_choice" ||
                                        e.target.value === "multiple_choice"
                                          ? question.options || [
                                              {
                                                id: generateId(),
                                                text: "Option A",
                                              },
                                              {
                                                id: generateId(),
                                                text: "Option B",
                                              },
                                            ]
                                          : undefined,
                                    })
                                  }
                                  className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                                  style={{
                                    backgroundColor: styles.backgroundColor,
                                    border: `1px solid ${styles.textColor}15`,
                                    color: styles.textColor,
                                  }}
                                >
                                  {Object.entries(questionTypeLabels).map(
                                    ([value, label]) => (
                                      <option key={value} value={value}>
                                        {label}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              {/* Question Text */}
                              <div>
                                <label
                                  className="block text-sm font-medium mb-1"
                                  style={{ color: `${styles.textColor}80` }}
                                >
                                  Question
                                </label>
                                <textarea
                                  value={question.question}
                                  onChange={(e) =>
                                    updateQuestion(question.id, {
                                      question: e.target.value,
                                    })
                                  }
                                  rows={2}
                                  className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none resize-none"
                                  style={{
                                    backgroundColor: styles.backgroundColor,
                                    border: `1px solid ${styles.textColor}15`,
                                    color: styles.textColor,
                                  }}
                                />
                              </div>

                              {/* Description */}
                              <div>
                                <label
                                  className="block text-sm font-medium mb-1"
                                  style={{ color: `${styles.textColor}80` }}
                                >
                                  Description (optional)
                                </label>
                                <input
                                  type="text"
                                  value={question.description || ""}
                                  onChange={(e) =>
                                    updateQuestion(question.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                                  style={{
                                    backgroundColor: styles.backgroundColor,
                                    border: `1px solid ${styles.textColor}15`,
                                    color: styles.textColor,
                                  }}
                                  placeholder="Add more context..."
                                />
                              </div>

                              {/* Options (for choice questions) */}
                              {(question.type === "single_choice" ||
                                question.type === "multiple_choice") && (
                                <div>
                                  <label
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: `${styles.textColor}80` }}
                                  >
                                    Options
                                  </label>
                                  <div className="space-y-2">
                                    {question.options?.map(
                                      (option, optIndex) => (
                                        <div
                                          key={option.id}
                                          className="flex items-center gap-2"
                                        >
                                          <span
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                                            style={{
                                              backgroundColor: `${styles.secondaryColor}15`,
                                              color: styles.secondaryColor,
                                            }}
                                          >
                                            {String.fromCharCode(65 + optIndex)}
                                          </span>
                                          <input
                                            type="text"
                                            value={option.text}
                                            onChange={(e) =>
                                              updateOption(
                                                question.id,
                                                option.id,
                                                e.target.value
                                              )
                                            }
                                            className="flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
                                            style={{
                                              backgroundColor:
                                                styles.backgroundColor,
                                              border: `1px solid ${styles.textColor}15`,
                                              color: styles.textColor,
                                            }}
                                          />
                                          <button
                                            onClick={() =>
                                              deleteOption(
                                                question.id,
                                                option.id
                                              )
                                            }
                                            disabled={
                                              (question.options?.length || 0) <=
                                              2
                                            }
                                            className="p-2 hover:text-red-500 disabled:opacity-30"
                                            style={{
                                              color: `${styles.textColor}60`,
                                            }}
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  <button
                                    onClick={() => addOption(question.id)}
                                    className="mt-2 text-sm font-medium flex items-center gap-1"
                                    style={{ color: styles.secondaryColor }}
                                  >
                                    <Plus size={14} />
                                    Add Option
                                  </button>
                                </div>
                              )}

                              {/* Required toggle */}
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={question.required}
                                  onChange={(e) =>
                                    updateQuestion(question.id, {
                                      required: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: styles.secondaryColor }}
                                />
                                <span
                                  className="text-sm"
                                  style={{ color: `${styles.textColor}80` }}
                                >
                                  Required question
                                </span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Question Button */}
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => addQuestion("single_choice")}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                      style={{
                        backgroundColor: `${styles.secondaryColor}15`,
                        color: styles.secondaryColor,
                      }}
                    >
                      <Plus size={16} />
                      Multiple Choice
                    </button>
                    <button
                      onClick={() => addQuestion("text")}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                      style={{
                        backgroundColor: `${styles.textColor}10`,
                        color: `${styles.textColor}80`,
                      }}
                    >
                      <Plus size={16} />
                      Text Input
                    </button>
                    <button
                      onClick={() => addQuestion("rating")}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                      style={{
                        backgroundColor: `${styles.textColor}10`,
                        color: `${styles.textColor}80`,
                      }}
                    >
                      <Plus size={16} />
                      Rating
                    </button>
                  </div>
                </div>

                {/* Conclusion Page */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    backgroundColor: styles.cardBackgroundColor,
                    border: `1px solid ${styles.textColor}10`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FileText
                      size={18}
                      style={{ color: styles.secondaryColor }}
                    />
                    <h3
                      className="font-semibold"
                      style={{ color: styles.textColor }}
                    >
                      Conclusion Page
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: `${styles.textColor}80` }}
                      >
                        Title
                      </label>
                      <input
                        type="text"
                        value={conclusionPage.title}
                        onChange={(e) =>
                          setConclusionPage({
                            ...conclusionPage,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: `${styles.textColor}80` }}
                      >
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={conclusionPage.subtitle || ""}
                        onChange={(e) =>
                          setConclusionPage({
                            ...conclusionPage,
                            subtitle: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: `${styles.textColor}80` }}
                      >
                        Description
                      </label>
                      <textarea
                        value={conclusionPage.description || ""}
                        onChange={(e) =>
                          setConclusionPage({
                            ...conclusionPage,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none resize-none"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>

                    {/* CTA Buttons */}
                    <div>
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: `${styles.textColor}80` }}
                      >
                        CTA Buttons
                      </label>
                      <div className="space-y-2">
                        {conclusionPage.ctaButtons?.map((button) => (
                          <div
                            key={button.id}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={button.text}
                              onChange={(e) =>
                                updateCtaButton(button.id, {
                                  text: e.target.value,
                                })
                              }
                              className="flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
                              style={{
                                backgroundColor: styles.backgroundColor,
                                border: `1px solid ${styles.textColor}15`,
                                color: styles.textColor,
                              }}
                              placeholder="Button text"
                            />
                            <input
                              type="url"
                              value={button.url || ""}
                              onChange={(e) =>
                                updateCtaButton(button.id, {
                                  url: e.target.value,
                                })
                              }
                              className="flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
                              style={{
                                backgroundColor: styles.backgroundColor,
                                border: `1px solid ${styles.textColor}15`,
                                color: styles.textColor,
                              }}
                              placeholder="URL (optional)"
                            />
                            <select
                              value={button.style}
                              onChange={(e) =>
                                updateCtaButton(button.id, {
                                  style: e.target.value as
                                    | "primary"
                                    | "secondary"
                                    | "outline",
                                })
                              }
                              className="px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
                              style={{
                                backgroundColor: styles.backgroundColor,
                                border: `1px solid ${styles.textColor}15`,
                                color: styles.textColor,
                              }}
                            >
                              <option value="primary">Primary</option>
                              <option value="secondary">Secondary</option>
                              <option value="outline">Outline</option>
                            </select>
                            <button
                              onClick={() => deleteCtaButton(button.id)}
                              className="p-2 hover:text-red-500"
                              style={{ color: `${styles.textColor}60` }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={addCtaButton}
                        className="mt-2 text-sm font-medium flex items-center gap-1"
                        style={{ color: styles.secondaryColor }}
                      >
                        <Plus size={14} />
                        Add Button
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Design Tab */}
            {activeTab === "design" && (
              <div
                className="rounded-xl p-6"
                style={{
                  backgroundColor: styles.cardBackgroundColor,
                  border: `1px solid ${styles.textColor}10`,
                }}
              >
                <h3
                  className="font-semibold mb-6"
                  style={{ color: styles.textColor }}
                >
                  Quiz Appearance
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: `${styles.textColor}80` }}
                    >
                      Primary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={styles.primaryColor}
                        onChange={(e) =>
                          setStyles({ ...styles, primaryColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                        style={{ borderColor: `${styles.textColor}15` }}
                      />
                      <input
                        type="text"
                        value={styles.primaryColor}
                        onChange={(e) =>
                          setStyles({ ...styles, primaryColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: `${styles.textColor}80` }}
                    >
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={styles.secondaryColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            secondaryColor: e.target.value,
                          })
                        }
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                        style={{ borderColor: `${styles.textColor}15` }}
                      />
                      <input
                        type="text"
                        value={styles.secondaryColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            secondaryColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: `${styles.textColor}80` }}
                    >
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={styles.backgroundColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            backgroundColor: e.target.value,
                          })
                        }
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                        style={{ borderColor: `${styles.textColor}15` }}
                      />
                      <input
                        type="text"
                        value={styles.backgroundColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            backgroundColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: `${styles.textColor}80` }}
                    >
                      Card Background
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={styles.cardBackgroundColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            cardBackgroundColor: e.target.value,
                          })
                        }
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                        style={{ borderColor: `${styles.textColor}15` }}
                      />
                      <input
                        type="text"
                        value={styles.cardBackgroundColor}
                        onChange={(e) =>
                          setStyles({
                            ...styles,
                            cardBackgroundColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: `${styles.textColor}80` }}
                    >
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={styles.textColor}
                        onChange={(e) =>
                          setStyles({ ...styles, textColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                        style={{ borderColor: `${styles.textColor}15` }}
                      />
                      <input
                        type="text"
                        value={styles.textColor}
                        onChange={(e) =>
                          setStyles({ ...styles, textColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: `${styles.textColor}80` }}
                    >
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={styles.accentColor}
                        onChange={(e) =>
                          setStyles({ ...styles, accentColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                        style={{ borderColor: `${styles.textColor}15` }}
                      />
                      <input
                        type="text"
                        value={styles.accentColor}
                        onChange={(e) =>
                          setStyles({ ...styles, accentColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                        style={{
                          backgroundColor: styles.backgroundColor,
                          border: `1px solid ${styles.textColor}15`,
                          color: styles.textColor,
                        }}
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: `${styles.textColor}80` }}
                    >
                      Border Radius
                    </label>
                    <div className="flex gap-2">
                      {(
                        ["none", "small", "medium", "large", "full"] as const
                      ).map((radius) => (
                        <button
                          key={radius}
                          onClick={() =>
                            setStyles({ ...styles, borderRadius: radius })
                          }
                          className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            backgroundColor:
                              styles.borderRadius === radius
                                ? `${styles.secondaryColor}15`
                                : styles.backgroundColor,
                            border: `1px solid ${
                              styles.borderRadius === radius
                                ? styles.secondaryColor
                                : `${styles.textColor}15`
                            }`,
                            color:
                              styles.borderRadius === radius
                                ? styles.secondaryColor
                                : `${styles.textColor}80`,
                          }}
                        >
                          {radius.charAt(0).toUpperCase() + radius.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: `${styles.textColor}80` }}
                    >
                      Font Family
                    </label>
                    <select
                      value={styles.fontFamily}
                      onChange={(e) =>
                        setStyles({ ...styles, fontFamily: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        backgroundColor: styles.backgroundColor,
                        border: `1px solid ${styles.textColor}15`,
                        color: styles.textColor,
                      }}
                    >
                      <option value="system-ui">System Default</option>
                      <option value="'Inter', sans-serif">Inter</option>
                      <option value="'DM Sans', sans-serif">DM Sans</option>
                      <option value="'Poppins', sans-serif">Poppins</option>
                      <option value="'Playfair Display', serif">
                        Playfair Display
                      </option>
                      <option value="'Merriweather', serif">
                        Merriweather
                      </option>
                      <option value="'JetBrains Mono', monospace">
                        JetBrains Mono
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div
                className="rounded-xl p-6"
                style={{
                  backgroundColor: styles.cardBackgroundColor,
                  border: `1px solid ${styles.textColor}10`,
                }}
              >
                <h3
                  className="font-semibold mb-6"
                  style={{ color: styles.textColor }}
                >
                  Contact Collection
                </h3>

                <div className="space-y-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contactSettings.enabled}
                      onChange={(e) =>
                        setContactSettings({
                          ...contactSettings,
                          enabled: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded"
                      style={{ accentColor: styles.secondaryColor }}
                    />
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: styles.textColor }}
                      >
                        Collect contact information
                      </span>
                      <p
                        className="text-sm"
                        style={{ color: `${styles.textColor}60` }}
                      >
                        Show a form before the results page
                      </p>
                    </div>
                  </label>

                  {contactSettings.enabled && (
                    <div
                      className="pl-8 space-y-4 border-l-2"
                      style={{ borderColor: `${styles.secondaryColor}40` }}
                    >
                      <div>
                        <label
                          className="block text-sm font-medium mb-1"
                          style={{ color: `${styles.textColor}80` }}
                        >
                          Form Title
                        </label>
                        <input
                          type="text"
                          value={contactSettings.title || ""}
                          onChange={(e) =>
                            setContactSettings({
                              ...contactSettings,
                              title: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                          style={{
                            backgroundColor: styles.backgroundColor,
                            border: `1px solid ${styles.textColor}15`,
                            color: styles.textColor,
                          }}
                          placeholder="Almost there!"
                        />
                      </div>
                      <div>
                        <label
                          className="block text-sm font-medium mb-1"
                          style={{ color: `${styles.textColor}80` }}
                        >
                          Form Description
                        </label>
                        <input
                          type="text"
                          value={contactSettings.description || ""}
                          onChange={(e) =>
                            setContactSettings({
                              ...contactSettings,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:outline-none"
                          style={{
                            backgroundColor: styles.backgroundColor,
                            border: `1px solid ${styles.textColor}15`,
                            color: styles.textColor,
                          }}
                          placeholder="Enter your details to see your results."
                        />
                      </div>

                      <div className="space-y-3">
                        <h4
                          className="text-sm font-medium"
                          style={{ color: `${styles.textColor}80` }}
                        >
                          Fields
                        </h4>

                        {/* Name Field */}
                        <div
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: styles.backgroundColor }}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={contactSettings.fields.name?.enabled}
                              onChange={(e) =>
                                setContactSettings({
                                  ...contactSettings,
                                  fields: {
                                    ...contactSettings.fields,
                                    name: {
                                      ...contactSettings.fields.name!,
                                      enabled: e.target.checked,
                                    },
                                  },
                                })
                              }
                              className="w-4 h-4 rounded"
                              style={{ accentColor: styles.secondaryColor }}
                            />
                            <span
                              className="text-sm"
                              style={{ color: `${styles.textColor}80` }}
                            >
                              Name
                            </span>
                          </div>
                          {contactSettings.fields.name?.enabled && (
                            <label
                              className="flex items-center gap-2 text-sm"
                              style={{ color: `${styles.textColor}60` }}
                            >
                              <input
                                type="checkbox"
                                checked={contactSettings.fields.name?.required}
                                onChange={(e) =>
                                  setContactSettings({
                                    ...contactSettings,
                                    fields: {
                                      ...contactSettings.fields,
                                      name: {
                                        ...contactSettings.fields.name!,
                                        required: e.target.checked,
                                      },
                                    },
                                  })
                                }
                                className="w-4 h-4 rounded"
                                style={{ accentColor: styles.secondaryColor }}
                              />
                              Required
                            </label>
                          )}
                        </div>

                        {/* Email Field */}
                        <div
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: styles.backgroundColor }}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={contactSettings.fields.email?.enabled}
                              onChange={(e) =>
                                setContactSettings({
                                  ...contactSettings,
                                  fields: {
                                    ...contactSettings.fields,
                                    email: {
                                      ...contactSettings.fields.email!,
                                      enabled: e.target.checked,
                                    },
                                  },
                                })
                              }
                              className="w-4 h-4 rounded"
                              style={{ accentColor: styles.secondaryColor }}
                            />
                            <span
                              className="text-sm"
                              style={{ color: `${styles.textColor}80` }}
                            >
                              Email
                            </span>
                          </div>
                          {contactSettings.fields.email?.enabled && (
                            <label
                              className="flex items-center gap-2 text-sm"
                              style={{ color: `${styles.textColor}60` }}
                            >
                              <input
                                type="checkbox"
                                checked={contactSettings.fields.email?.required}
                                onChange={(e) =>
                                  setContactSettings({
                                    ...contactSettings,
                                    fields: {
                                      ...contactSettings.fields,
                                      email: {
                                        ...contactSettings.fields.email!,
                                        required: e.target.checked,
                                      },
                                    },
                                  })
                                }
                                className="w-4 h-4 rounded"
                                style={{ accentColor: styles.secondaryColor }}
                              />
                              Required
                            </label>
                          )}
                        </div>

                        {/* Phone Field */}
                        <div
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: styles.backgroundColor }}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={contactSettings.fields.phone?.enabled}
                              onChange={(e) =>
                                setContactSettings({
                                  ...contactSettings,
                                  fields: {
                                    ...contactSettings.fields,
                                    phone: {
                                      ...contactSettings.fields.phone!,
                                      enabled: e.target.checked,
                                    },
                                  },
                                })
                              }
                              className="w-4 h-4 rounded"
                              style={{ accentColor: styles.secondaryColor }}
                            />
                            <span
                              className="text-sm"
                              style={{ color: `${styles.textColor}80` }}
                            >
                              Phone
                            </span>
                          </div>
                          {contactSettings.fields.phone?.enabled && (
                            <label
                              className="flex items-center gap-2 text-sm"
                              style={{ color: `${styles.textColor}60` }}
                            >
                              <input
                                type="checkbox"
                                checked={contactSettings.fields.phone?.required}
                                onChange={(e) =>
                                  setContactSettings({
                                    ...contactSettings,
                                    fields: {
                                      ...contactSettings.fields,
                                      phone: {
                                        ...contactSettings.fields.phone!,
                                        required: e.target.checked,
                                      },
                                    },
                                  })
                                }
                                className="w-4 h-4 rounded"
                                style={{ accentColor: styles.secondaryColor }}
                              />
                              Required
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div
          className="w-[400px] flex-shrink-0 border-l overflow-hidden"
          style={{ borderColor: `${styles.textColor}10` }}
        >
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
