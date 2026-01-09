import { supabase } from "@/lib/supabase";

export interface QuizSubmission {
  id: string;
  quiz_id: string;
  answers: Array<{
    questionId: string;
    value: string | string[] | number;
  }>;
  contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  completed_at: string;
}

export interface CreateQuizSubmissionData {
  quiz_id: string;
  answers: Array<{
    questionId: string;
    value: string | string[] | number;
  }>;
  contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export const quizSubmissionsApi = {
  async create(
    submissionData: CreateQuizSubmissionData
  ): Promise<QuizSubmission> {
    const { data, error } = await supabase
      .from("quiz_submissions")
      .insert({
        quiz_id: submissionData.quiz_id,
        answers: submissionData.answers,
        contact_info: submissionData.contact_info || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as QuizSubmission;
  },

  async getByQuizId(quizId: string): Promise<QuizSubmission[]> {
    const { data, error } = await supabase
      .from("quiz_submissions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("completed_at", { ascending: false });

    if (error) throw error;
    return (data as QuizSubmission[]) || [];
  },

  async getByAuthorId(authorId: string): Promise<QuizSubmission[]> {
    // Get all submissions for quizzes owned by this author
    // First get all quiz IDs for this author
    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select("id")
      .eq("user_id", authorId);

    if (quizzesError) throw quizzesError;
    if (!quizzes || quizzes.length === 0) return [];

    const quizIds = quizzes.map((q) => q.id);

    // Then get all submissions for those quizzes
    const { data, error } = await supabase
      .from("quiz_submissions")
      .select("*")
      .in("quiz_id", quizIds)
      .order("completed_at", { ascending: false });

    if (error) throw error;
    return (data as QuizSubmission[]) || [];
  },
};
