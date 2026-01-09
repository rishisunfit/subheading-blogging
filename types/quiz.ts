// Quiz Funnel Types

export interface QuizOption {
  id: string;
  text: string;
  value?: string | number;
}

export interface QuizQuestion {
  id: string;
  type:
    | "multiple_choice"
    | "single_choice"
    | "text"
    | "email"
    | "phone"
    | "rating";
  question: string;
  description?: string;
  options?: QuizOption[];
  required?: boolean;
  placeholder?: string;
}

export interface QuizCoverPage {
  title: string;
  subtitle?: string;
  description?: string;
  buttonText: string;
  imageUrl?: string;
}

export interface QuizConclusionPage {
  title: string;
  subtitle?: string;
  description?: string;
  showScore?: boolean;
  ctaButtons?: QuizCTAButton[];
}

export interface QuizCTAButton {
  id: string;
  text: string;
  url?: string;
  style: "primary" | "secondary" | "outline";
}

export interface QuizContactSettings {
  enabled: boolean;
  position: "before_conclusion" | "in_conclusion";
  fields: {
    email?: { enabled: boolean; required: boolean };
    phone?: { enabled: boolean; required: boolean };
    name?: { enabled: boolean; required: boolean };
  };
  title?: string;
  description?: string;
}

export interface QuizStyles {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: "none" | "small" | "medium" | "large" | "full";
}

export interface Quiz {
  id: string;
  title: string;
  slug?: string;
  coverPage: QuizCoverPage;
  questions: QuizQuestion[];
  conclusionPage: QuizConclusionPage;
  contactSettings: QuizContactSettings;
  styles: QuizStyles;
  createdAt: string;
  updatedAt: string;
  userId: string;
  status: "draft" | "published";
}

export interface QuizAnswer {
  questionId: string;
  value: string | string[] | number;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  answers: QuizAnswer[];
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  score?: number;
  completedAt: string;
}

// Default styles for new quizzes
export const defaultQuizStyles: QuizStyles = {
  primaryColor: "#0f172a",
  secondaryColor: "#6366f1",
  backgroundColor: "#fafaf9",
  cardBackgroundColor: "#ffffff",
  textColor: "#1e293b",
  accentColor: "#8b5cf6",
  fontFamily: "system-ui",
  borderRadius: "large",
};

export const defaultContactSettings: QuizContactSettings = {
  enabled: true,
  position: "before_conclusion",
  fields: {
    email: { enabled: true, required: true },
    phone: { enabled: false, required: false },
    name: { enabled: true, required: false },
  },
  title: "Almost there!",
  description: "Enter your details to see your results.",
};
