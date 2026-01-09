"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { DashboardShimmer } from "@/components/DashboardShimmer";
import { postsApi } from "@/services/posts";
import { quizzesApi } from "@/services/quizzes";
import { foldersApi, type Folder } from "@/services/folders";
import { useAuth } from "@/hooks/useAuth";
import { useDialog } from "@/hooks/useDialog";
import { Quiz } from "@/types/quiz";

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  status: "draft" | "published";
  user_id: string;
  is_draft: boolean;
};

// Helper to convert DB post to UI format
const convertPost = (post: Post) => ({
  id: post.id,
  title: post.title,
  content: post.content,
  createdAt: new Date(post.created_at),
  updatedAt: new Date(post.updated_at),
  status: post.status as "draft" | "published",
  user_id: post.user_id,
  is_draft: post.is_draft,
  folder_id:
    (post as unknown as { folder_id: string | null }).folder_id || null,
  folder_slug:
    (post as unknown as { folder_slug: string | null }).folder_slug || null,
  post_slug:
    (post as unknown as { post_slug: string | null }).post_slug || null,
});

// Helper to convert quiz to UI format
const convertQuiz = (quiz: Quiz) => ({
  id: quiz.id,
  title: quiz.title,
  questionsCount: quiz.questions.length,
  createdAt: new Date(quiz.createdAt),
  updatedAt: new Date(quiz.updatedAt),
  status: quiz.status,
});

export default function DashboardPage() {
  const [posts, setPosts] = useState<ReturnType<typeof convertPost>[]>([]);
  const [quizzes, setQuizzes] = useState<ReturnType<typeof convertQuiz>[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const { signOut, profile, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showDialog } = useDialog();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load posts and quizzes on mount (only if authenticated)
  useEffect(() => {
    if (user) {
      loadData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [postsData, quizzesData, foldersData] = await Promise.all([
        postsApi.getAll(),
        quizzesApi.getAll(),
        foldersApi.getAll(),
      ]);
      setPosts(postsData.map(convertPost));
      setQuizzes(quizzesData.map(convertQuiz));
      setFolders(foldersData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Post handlers
  const handleCreatePost = () => {
    router.push("/editor/new");
  };

  const handleEditPost = (postId: string) => {
    router.push(`/editor/${postId}`);
  };

  const handlePreviewPost = (postId: string) => {
    router.push(`/preview/${postId}`);
  };

  const handleViewAnalytics = (postId: string) => {
    router.push(`/analytics/${postId}`);
  };

  const handleDeletePost = async (id: string) => {
    const confirmed = await showDialog({
      type: "confirm",
      message: "Are you sure you want to delete this post?",
      title: "Delete Post",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (confirmed) {
      try {
        await postsApi.delete(id);
        setPosts(posts.filter((p) => p.id !== id));
      } catch (error) {
        console.error("Error deleting post:", error);
        await showDialog({
          type: "alert",
          message: "Failed to delete post",
          title: "Error",
        });
      }
    }
  };

  // Quiz handlers
  const handleCreateQuiz = () => {
    router.push("/quiz/new");
  };

  const handleEditQuiz = (quizId: string) => {
    router.push(`/quiz/${quizId}/edit`);
  };

  const handlePreviewQuiz = (quizId: string) => {
    router.push(`/quiz/${quizId}`);
  };

  const handleDeleteQuiz = async (id: string) => {
    const confirmed = await showDialog({
      type: "confirm",
      message: "Are you sure you want to delete this quiz?",
      title: "Delete Quiz",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (confirmed) {
      try {
        await quizzesApi.delete(id);
        setQuizzes(quizzes.filter((q) => q.id !== id));
      } catch (error) {
        console.error("Error deleting quiz:", error);
        await showDialog({
          type: "alert",
          message: "Failed to delete quiz",
          title: "Error",
        });
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Show loading while auth is checking
  if (authLoading || loading) {
    return <DashboardShimmer />;
  }

  // Redirect handled in useEffect above
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Header with user info and logout */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blogish</h1>
            {profile?.name && (
              <p className="text-sm text-gray-600">Welcome, {profile.name}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      <Dashboard
        onCreatePost={handleCreatePost}
        onEditPost={handleEditPost}
        onDeletePost={handleDeletePost}
        onPreviewPost={handlePreviewPost}
        onViewAnalytics={handleViewAnalytics}
        onCreateQuiz={handleCreateQuiz}
        onEditQuiz={handleEditQuiz}
        onDeleteQuiz={handleDeleteQuiz}
        onPreviewQuiz={handlePreviewQuiz}
        posts={posts}
        quizzes={quizzes}
        folders={folders}
        onFoldersChange={async () => {
          // Reload both posts and folders to get updated counts
          const [postsData, foldersData] = await Promise.all([
            postsApi.getAll(),
            foldersApi.getAll(),
          ]);
          setPosts(postsData.map(convertPost));
          setFolders(foldersData);
        }}
        isCreating={false}
      />
    </>
  );
}
