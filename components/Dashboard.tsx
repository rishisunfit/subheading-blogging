import { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  ClipboardList,
  Eye,
  ExternalLink,
  MessageSquare,
  Mail,
  Phone,
  Reply,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  BarChart3,
  Folder as FolderIcon,
  X,
  Check,
} from "lucide-react";
import {
  formSubmissionsApi,
  type FormSubmission,
} from "@/services/formSubmissions";
import {
  quizSubmissionsApi,
  type QuizSubmission,
} from "@/services/quizSubmissions";
import { useAuth } from "@/hooks/useAuth";
import { ReplyModal } from "./ReplyModal";
import { supabase } from "@/lib/supabase";
import { useDialog } from "@/hooks/useDialog";
import { quizzesApi } from "@/services/quizzes";
import { foldersApi, generateSlug, type Folder } from "@/services/folders";
import { postsApi } from "@/services/posts";
import type { Quiz as FullQuiz, QuizQuestion } from "@/types/quiz";

type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: "draft" | "published";
  folder_id?: string | null;
  folder_slug?: string | null;
  post_slug?: string | null;
};

type Quiz = {
  id: string;
  title: string;
  questionsCount: number;
  createdAt: Date;
  updatedAt: Date;
  status: "draft" | "published";
};

type ContentTab =
  | "posts"
  | "quizzes"
  | "responses"
  | "quiz-responses"
  | "folders";

interface DashboardProps {
  onCreatePost: () => void;
  onEditPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onPreviewPost?: (postId: string) => void;
  onViewAnalytics?: (postId: string) => void;
  onCreateQuiz?: () => void;
  onEditQuiz?: (quizId: string) => void;
  onDeleteQuiz?: (quizId: string) => void;
  onPreviewQuiz?: (quizId: string) => void;
  posts: Post[];
  quizzes?: Quiz[];
  folders?: Folder[];
  onFoldersChange?: () => void;
  isCreating?: boolean;
}

export function Dashboard({
  onCreatePost,
  onEditPost,
  onDeletePost,
  onPreviewPost,
  onViewAnalytics,
  onCreateQuiz = () => {},
  onEditQuiz = () => {},
  onDeleteQuiz = () => {},
  onPreviewQuiz = () => {},
  posts,
  quizzes = [],
  folders = [],
  onFoldersChange,
  isCreating = false,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>("posts");
  const [responses, setResponses] = useState<FormSubmission[]>([]);
  const [quizResponses, setQuizResponses] = useState<QuizSubmission[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [loadingQuizResponses, setLoadingQuizResponses] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] =
    useState<FormSubmission | null>(null);
  const [expandedQuizResponses, setExpandedQuizResponses] = useState<
    Set<string>
  >(new Set());
  const [quizDataCache, setQuizDataCache] = useState<Map<string, FullQuiz>>(
    new Map()
  );

  // Search states for each tab
  const [searchPosts, setSearchPosts] = useState("");
  const [searchQuizzes, setSearchQuizzes] = useState("");
  const [searchResponses, setSearchResponses] = useState("");
  const [searchQuizResponses, setSearchQuizResponses] = useState("");

  // Folder filter for posts tab
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<
    string | null
  >(null);

  // Folder management state
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderSlug, setNewFolderSlug] = useState("");
  const [showCreateFolderForm, setShowCreateFolderForm] = useState(false);

  // Post selection modal state
  const [showAddPostsModal, setShowAddPostsModal] = useState(false);
  const [selectedFolderForPosts, setSelectedFolderForPosts] = useState<
    string | null
  >(null);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(
    new Set()
  );
  const [addingPosts, setAddingPosts] = useState(false);
  const [searchPostsInModal, setSearchPostsInModal] = useState("");

  const { user } = useAuth();
  const { showDialog } = useDialog();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Load responses when user is available (load on mount to get accurate count)
  useEffect(() => {
    if (user?.id) {
      loadResponses();
      loadQuizResponses();
    }
  }, [user?.id]);

  const loadResponses = async () => {
    if (!user?.id) return;

    setLoadingResponses(true);
    try {
      const data = await formSubmissionsApi.getByAuthorId(user.id);
      setResponses(data);
    } catch (error) {
      console.error("Error loading responses:", error);
    } finally {
      setLoadingResponses(false);
    }
  };

  const loadQuizResponses = async () => {
    if (!user?.id) return;

    setLoadingQuizResponses(true);
    try {
      const data = await quizSubmissionsApi.getByAuthorId(user.id);
      setQuizResponses(data);
    } catch (error) {
      console.error("Error loading quiz responses:", error);
    } finally {
      setLoadingQuizResponses(false);
    }
  };

  // Get post title by ID
  const getPostTitle = (postId: string | null) => {
    if (!postId) return "Unknown Post";
    const post = posts.find((p) => p.id === postId);
    return post?.title || "Unknown Post";
  };

  // Get quiz title by ID
  const getQuizTitle = (quizId: string) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    return quiz?.title || "Unknown Quiz";
  };

  // Load quiz data for a specific quiz ID
  const loadQuizData = async (quizId: string): Promise<FullQuiz | null> => {
    // Check cache first
    if (quizDataCache.has(quizId)) {
      return quizDataCache.get(quizId) || null;
    }

    try {
      const quiz = await quizzesApi.getById(quizId);
      if (quiz) {
        setQuizDataCache((prev) => new Map(prev).set(quizId, quiz));
        return quiz;
      }
      return null;
    } catch (error) {
      console.error(`Error loading quiz ${quizId}:`, error);
      return null;
    }
  };

  // Get question text by question ID
  const getQuestionText = (quizId: string, questionId: string): string => {
    const quiz = quizDataCache.get(quizId);
    if (!quiz) return `Question ${questionId}`;
    const question = quiz.questions.find((q) => q.id === questionId);
    return question?.question || `Question ${questionId}`;
  };

  // Get formatted answer text
  const getAnswerText = (
    quizId: string,
    questionId: string,
    answerValue: string | string[] | number
  ): string => {
    const quiz = quizDataCache.get(quizId);
    if (!quiz) {
      // Fallback: return raw value
      return Array.isArray(answerValue)
        ? answerValue.join(", ")
        : String(answerValue);
    }

    const question = quiz.questions.find(
      (q: QuizQuestion) => q.id === questionId
    );
    if (!question) {
      return Array.isArray(answerValue)
        ? answerValue.join(", ")
        : String(answerValue);
    }

    // Handle different question types
    if (question.type === "rating") {
      return `${answerValue} out of 5 stars`;
    }

    if (
      question.type === "text" ||
      question.type === "email" ||
      question.type === "phone"
    ) {
      return (answerValue as string) || "Not provided";
    }

    if (question.type === "multiple_choice") {
      const selectedIds = answerValue as string[];
      const selectedOptions =
        question.options?.filter((o: { id: string; text: string }) =>
          selectedIds.includes(o.id)
        ) || [];
      return (
        selectedOptions.map((o: { text: string }) => o.text).join(", ") ||
        "None selected"
      );
    }

    // Single choice
    const selectedOption = question.options?.find(
      (o: { id: string; text: string }) => o.id === answerValue
    );
    return selectedOption?.text || String(answerValue);
  };

  // Toggle expanded state for a quiz response
  const toggleQuizResponse = async (responseId: string, quizId: string) => {
    const isExpanded = expandedQuizResponses.has(responseId);
    if (isExpanded) {
      setExpandedQuizResponses((prev) => {
        const next = new Set(prev);
        next.delete(responseId);
        return next;
      });
    } else {
      // Load quiz data if not cached
      if (!quizDataCache.has(quizId)) {
        await loadQuizData(quizId);
      }
      setExpandedQuizResponses((prev) => new Set(prev).add(responseId));
    }
  };

  // Filter functions
  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.title
      .toLowerCase()
      .includes(searchPosts.toLowerCase());
    if (!selectedFolderFilter) return matchesSearch;

    const postFolderId = post.folder_id;

    if (selectedFolderFilter === "unfiled") {
      return matchesSearch && !postFolderId;
    }
    return matchesSearch && postFolderId === selectedFolderFilter;
  });

  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.title.toLowerCase().includes(searchQuizzes.toLowerCase())
  );

  const filteredResponses = responses.filter((response) => {
    const query = searchResponses.toLowerCase();
    if (!query) return true;

    const email = response.email?.toLowerCase() || "";
    const phone = response.phone?.toLowerCase() || "";
    const message = response.message?.toLowerCase() || "";
    const postTitle = getPostTitle(response.post_id).toLowerCase();

    return (
      email.includes(query) ||
      phone.includes(query) ||
      message.includes(query) ||
      postTitle.includes(query)
    );
  });

  const filteredQuizResponses = quizResponses.filter((response) => {
    const query = searchQuizResponses.toLowerCase();
    if (!query) return true;

    const name = response.contact_info?.name?.toLowerCase() || "";
    const phone = response.contact_info?.phone?.toLowerCase() || "";
    const email = response.contact_info?.email?.toLowerCase() || "";
    const quizTitle = getQuizTitle(response.quiz_id).toLowerCase();

    // Search in answer content
    const answerText = response.answers
      .map((answer) => {
        try {
          return getAnswerText(
            response.quiz_id,
            answer.questionId,
            answer.value
          );
        } catch {
          return String(answer.value);
        }
      })
      .join(" ")
      .toLowerCase();

    return (
      name.includes(query) ||
      phone.includes(query) ||
      email.includes(query) ||
      quizTitle.includes(query) ||
      answerText.includes(query)
    );
  });

  const handleOpenReply = (response: FormSubmission) => {
    if (!response.email && !response.phone) {
      showDialog({
        type: "alert",
        title: "No Contact Information",
        message:
          "This submission doesn't have email or phone number to reply to.",
      });
      return;
    }
    setSelectedResponse(response);
    setReplyModalOpen(true);
  };

  const handleSendReply = async (message: string) => {
    if (!selectedResponse || !user) {
      throw new Error("Missing response or user information");
    }

    // Get the session token
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Please log in to send a reply");
    }

    const response = await fetch("/api/send-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        submission_id: selectedResponse.id,
        email: selectedResponse.email,
        phone: selectedResponse.phone,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.details || "Failed to send reply"
      );
    }

    // Show success message (non-blocking)
    const contactMethod = selectedResponse.email ? "Email" : "SMS";
    showDialog({
      type: "alert",
      title: "Reply Sent",
      message: `Your reply has been sent successfully via ${contactMethod}.`,
    });
  };

  // Folder management functions
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const slug = newFolderSlug.trim() || generateSlug(newFolderName);
      await foldersApi.create({ name: newFolderName.trim(), slug });
      setNewFolderName("");
      setNewFolderSlug("");
      setShowCreateFolderForm(false);
      if (onFoldersChange) onFoldersChange();
    } catch (error) {
      console.error("Error creating folder:", error);
      await showDialog({
        type: "alert",
        message:
          error instanceof Error ? error.message : "Failed to create folder",
        title: "Error",
      });
    }
  };

  const handleUpdateFolder = async (
    folder: Folder,
    name: string,
    slug: string
  ) => {
    try {
      await foldersApi.update(folder.id, {
        name: name.trim(),
        slug: slug.trim(),
      });
      setEditingFolder(null);
      if (onFoldersChange) onFoldersChange();
    } catch (error) {
      console.error("Error updating folder:", error);
      await showDialog({
        type: "alert",
        message:
          error instanceof Error ? error.message : "Failed to update folder",
        title: "Error",
      });
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    const folderName = folder?.name || "this folder";
    const postsInFolder = posts.filter((p) => p.folder_id === folderId);
    const postCount = postsInFolder.length;

    const confirmed = await showDialog({
      type: "confirm",
      message: `Are you sure you want to delete "${folderName}"? This will permanently delete the folder and mark all ${postCount} post${
        postCount !== 1 ? "s" : ""
      } in this folder as unfiled. This action cannot be undone.`,
      title: "Delete Folder",
      confirmText: "Delete Folder",
      cancelText: "Cancel",
    });

    if (confirmed) {
      try {
        // First, update all posts in this folder to be unfiled (folder_id = null)
        // The database trigger should handle this, but we'll do it explicitly for clarity
        await Promise.all(
          postsInFolder.map((post) =>
            postsApi.update(post.id, { folder_id: null })
          )
        );

        // Then delete the folder
        await foldersApi.delete(folderId);

        if (selectedFolderFilter === folderId) {
          setSelectedFolderFilter(null);
        }
        if (onFoldersChange) onFoldersChange();

        await showDialog({
          type: "alert",
          message: `Folder "${folderName}" has been deleted. ${postCount} post${
            postCount !== 1 ? "s have" : " has"
          } been marked as unfiled.`,
          title: "Folder Deleted",
        });
      } catch (error) {
        console.error("Error deleting folder:", error);
        await showDialog({
          type: "alert",
          message:
            error instanceof Error ? error.message : "Failed to delete folder",
          title: "Error",
        });
      }
    }
  };

  // Get post count for a folder
  const getFolderPostCount = (folderId: string | null): number => {
    if (!folderId) {
      return posts.filter((p) => !p.folder_id).length;
    }
    return posts.filter((p) => p.folder_id === folderId).length;
  };

  // Handle opening add posts modal
  const handleOpenAddPosts = (folderId: string) => {
    setSelectedFolderForPosts(folderId);
    // Pre-select posts that are already in this folder
    const postsInFolder = posts
      .filter((post) => post.folder_id === folderId)
      .map((post) => post.id);
    setSelectedPostIds(new Set(postsInFolder));
    setSearchPostsInModal("");
    setShowAddPostsModal(true);
  };

  // Handle adding/removing posts to/from folder
  const handleAddPostsToFolder = async () => {
    if (!selectedFolderForPosts) return;

    try {
      setAddingPosts(true);

      // Get posts that were originally in the folder
      const originalPostsInFolder = posts
        .filter((post) => post.folder_id === selectedFolderForPosts)
        .map((post) => post.id);

      // Posts to add (selected but not originally in folder)
      const postsToAdd = Array.from(selectedPostIds).filter(
        (postId) => !originalPostsInFolder.includes(postId)
      );

      // Posts to remove (originally in folder but now unselected)
      const postsToRemove = originalPostsInFolder.filter(
        (postId) => !selectedPostIds.has(postId)
      );

      // Update posts: add to folder
      await Promise.all(
        postsToAdd.map((postId) =>
          postsApi.update(postId, { folder_id: selectedFolderForPosts })
        )
      );

      // Update posts: remove from folder (set folder_id to null)
      await Promise.all(
        postsToRemove.map((postId) =>
          postsApi.update(postId, { folder_id: null })
        )
      );

      // Reload data
      if (onFoldersChange) onFoldersChange();
      setShowAddPostsModal(false);
      setSelectedPostIds(new Set());
      setSelectedFolderForPosts(null);
      setSearchPostsInModal("");

      const addedCount = postsToAdd.length;
      const removedCount = postsToRemove.length;
      let message = "";
      if (addedCount > 0 && removedCount > 0) {
        message = `Successfully added ${addedCount} post${
          addedCount > 1 ? "s" : ""
        } and removed ${removedCount} post${
          removedCount > 1 ? "s" : ""
        } from folder.`;
      } else if (addedCount > 0) {
        message = `Successfully added ${addedCount} post${
          addedCount > 1 ? "s" : ""
        } to folder.`;
      } else if (removedCount > 0) {
        message = `Successfully removed ${removedCount} post${
          removedCount > 1 ? "s" : ""
        } from folder.`;
      } else {
        message = "Folder updated.";
      }

      await showDialog({
        type: "alert",
        message,
        title: "Success",
      });
    } catch (error) {
      console.error("Error updating posts in folder:", error);
      await showDialog({
        type: "alert",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update posts in folder",
        title: "Error",
      });
    } finally {
      setAddingPosts(false);
    }
  };

  // Toggle post selection
  const togglePostSelection = (postId: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  // Get posts for the modal: posts in folder first (sorted by date), then posts not in folder (sorted by date), filtered by search
  const getAvailablePosts = () => {
    if (!selectedFolderForPosts) return [];

    // Get posts in the folder
    let postsInFolder = posts.filter(
      (post) => post.folder_id === selectedFolderForPosts
    );

    // Get posts not in the folder
    let postsNotInFolder = posts.filter(
      (post) => post.folder_id !== selectedFolderForPosts
    );

    // Sort both by most recently created (newest first)
    postsInFolder = postsInFolder.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    postsNotInFolder = postsNotInFolder.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Combine: posts in folder first, then posts not in folder
    let allPosts = [...postsInFolder, ...postsNotInFolder];

    // Filter by search query
    if (searchPostsInModal.trim()) {
      const query = searchPostsInModal.toLowerCase();
      allPosts = allPosts.filter((post) =>
        post.title.toLowerCase().includes(query)
      );
    }

    return allPosts;
  };

  // Check if a post is in the folder (for visual distinction)
  const isPostInFolder = (postId: string) => {
    if (!selectedFolderForPosts) return false;
    const post = posts.find((p) => p.id === postId);
    return post?.folder_id === selectedFolderForPosts;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Blogish</h1>
            <p className="text-gray-600 mt-2">Your stories, beautifully told</p>
          </div>
          <div className="flex gap-3">
            {activeTab === "posts" && (
              <button
                onClick={onCreatePost}
                disabled={isCreating}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                {isCreating ? "Creating..." : "New Post"}
              </button>
            )}
            {activeTab === "quizzes" && (
              <button
                onClick={onCreateQuiz}
                disabled={isCreating}
                className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                New Quiz
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200 w-fit">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === "posts"
                ? "bg-black text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FileText size={18} />
            Posts
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "posts" ? "bg-white/20" : "bg-gray-200"
              }`}
            >
              {posts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("quizzes")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === "quizzes"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ClipboardList size={18} />
            Quizzes
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "quizzes" ? "bg-white/20" : "bg-gray-200"
              }`}
            >
              {quizzes.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("responses")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === "responses"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <MessageSquare size={18} />
            Responses
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "responses" ? "bg-white/20" : "bg-gray-200"
              }`}
            >
              {responses.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("quiz-responses")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === "quiz-responses"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users size={18} />
            Quiz Responses
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "quiz-responses" ? "bg-white/20" : "bg-gray-200"
              }`}
            >
              {quizResponses.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("folders")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === "folders"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FolderIcon size={18} />
            Folders
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "folders" ? "bg-white/20" : "bg-gray-200"
              }`}
            >
              {folders.length}
            </span>
          </button>
        </div>

        {/* Stats - Posts */}
        {activeTab === "posts" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-gray-900">
                {posts.length}
              </div>
              <div className="text-gray-600 text-sm mt-1">Total Posts</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-green-600">
                {posts.filter((p) => p.status === "published").length}
              </div>
              <div className="text-gray-600 text-sm mt-1">Published</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-yellow-600">
                {posts.filter((p) => p.status === "draft").length}
              </div>
              <div className="text-gray-600 text-sm mt-1">Drafts</div>
            </div>
          </div>
        )}

        {/* Stats - Quizzes */}
        {activeTab === "quizzes" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-gray-900">
                {quizzes.length}
              </div>
              <div className="text-gray-600 text-sm mt-1">Total Quizzes</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-green-600">
                {quizzes.filter((q) => q.status === "published").length}
              </div>
              <div className="text-gray-600 text-sm mt-1">Published</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-violet-600">
                {quizzes.reduce((acc, q) => acc + q.questionsCount, 0)}
              </div>
              <div className="text-gray-600 text-sm mt-1">Total Questions</div>
            </div>
          </div>
        )}

        {/* Stats - Responses */}
        {activeTab === "responses" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-gray-900">
                {responses.length}
              </div>
              <div className="text-gray-600 text-sm mt-1">Total Responses</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-blue-600">
                {responses.filter((r) => r.email).length}
              </div>
              <div className="text-gray-600 text-sm mt-1">With Email</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl font-bold text-green-600">
                {responses.filter((r) => r.phone).length}
              </div>
              <div className="text-gray-600 text-sm mt-1">With Phone</div>
            </div>
          </div>
        )}

        {/* Posts List */}
        {activeTab === "posts" && (
          <>
            {/* Search Bar and Folder Filter for Posts */}
            <div className="mb-6 flex gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search posts by title..."
                  value={searchPosts}
                  onChange={(e) => setSearchPosts(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedFolderFilter || ""}
                  onChange={(e) =>
                    setSelectedFolderFilter(e.target.value || null)
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white pr-10"
                >
                  <option value="">All Posts</option>
                  <option value="unfiled">Unfiled</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <FolderIcon
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={18}
                />
              </div>
            </div>
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                // Strip HTML tags and get plain text preview
                const plainText = post.content
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                const wordCount = plainText
                  .split(" ")
                  .filter((word) => word.length > 0).length;
                const preview = plainText.substring(0, 120);

                return (
                  <div
                    key={post.id}
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header: Title and Status */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-gray-900">
                              {post.title}
                            </h2>
                            {/* Folder Tag */}
                            {post.folder_id &&
                              (() => {
                                const folder = folders.find(
                                  (f) => f.id === post.folder_id
                                );
                                return folder ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <FolderIcon
                                      size={14}
                                      className="text-orange-600"
                                    />
                                    <span className="text-xs text-orange-600 font-medium">
                                      {folder.name}
                                    </span>
                                  </div>
                                ) : null;
                              })()}
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                              post.status === "published"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {post.status}
                          </span>
                        </div>

                        {/* Content Preview */}
                        {plainText ? (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {preview}
                            {plainText.length > 120 ? "..." : ""}
                          </p>
                        ) : (
                          <p className="text-gray-400 italic text-sm mb-3">
                            No content yet
                          </p>
                        )}

                        {/* Metadata - Subtle footer */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatDate(post.createdAt)}</span>
                          <span>•</span>
                          <span>
                            {wordCount} {wordCount === 1 ? "word" : "words"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        {/* Preview Button - use canonical URL for published posts with folder/slug, otherwise /posts/[id] */}
                        {(() => {
                          // Published posts with canonical URL use canonical path
                          if (
                            post.status === "published" &&
                            post.folder_slug &&
                            post.post_slug
                          ) {
                            return (
                              <a
                                href={`/${post.folder_slug}/${post.post_slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Preview (Canonical URL)"
                              >
                                <Eye size={20} />
                              </a>
                            );
                          }
                          // Draft posts or unfiled posts use /posts/[id]
                          if (onPreviewPost) {
                            return (
                              <a
                                href={`/posts/${post.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Eye size={20} />
                              </a>
                            );
                          }
                          return null;
                        })()}
                        {onViewAnalytics && (
                          <button
                            onClick={() => onViewAnalytics(post.id)}
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Analytics"
                          >
                            <BarChart3 size={20} />
                          </button>
                        )}
                        <button
                          onClick={() => onEditPost(post.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => onDeletePost(post.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredPosts.length === 0 && searchPosts && (
              <div className="text-center py-16">
                <Search size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No posts found
                </h3>
                <p className="text-gray-600 mb-6">
                  No posts match your search query "{searchPosts}".
                </p>
              </div>
            )}
            {posts.length === 0 && !searchPosts && (
              <div className="text-center py-16">
                <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No posts yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first blog post
                </p>
                <button
                  onClick={onCreatePost}
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                  {isCreating ? "Creating..." : "Create Your First Post"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Responses List */}
        {activeTab === "responses" && (
          <>
            {/* Search Bar for Responses */}
            <div className="mb-6">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search by name, phone, email, or message..."
                  value={searchResponses}
                  onChange={(e) => setSearchResponses(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>
            {loadingResponses ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading responses...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResponses.map((response) => (
                  <div
                    key={response.id}
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getPostTitle(response.post_id)}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(response.created_at)}
                          </span>
                        </div>
                        <div className="mb-3">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {response.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {response.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={14} />
                              <span>{response.email}</span>
                            </div>
                          )}
                          {response.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={14} />
                              <span>{response.phone}</span>
                            </div>
                          )}
                          {!response.email && !response.phone && (
                            <span className="text-gray-400 italic">
                              No contact information
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {(response.email || response.phone) && (
                          <button
                            onClick={() => handleOpenReply(response)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Reply"
                          >
                            <Reply size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingResponses &&
              filteredResponses.length === 0 &&
              searchResponses && (
                <div className="text-center py-16">
                  <Search size={64} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No responses found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    No responses match your search query "{searchResponses}".
                  </p>
                </div>
              )}
            {!loadingResponses &&
              responses.length === 0 &&
              !searchResponses && (
                <div className="text-center py-16">
                  <MessageSquare
                    size={64}
                    className="mx-auto text-gray-300 mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No responses yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Responses from your published posts will appear here
                  </p>
                </div>
              )}
          </>
        )}

        {/* Quizzes List */}
        {activeTab === "quizzes" && (
          <>
            {/* Search Bar for Quizzes */}
            <div className="mb-6">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search quizzes by title..."
                  value={searchQuizzes}
                  onChange={(e) => setSearchQuizzes(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent"
                />
              </div>
            </div>
            <div className="space-y-4">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                          <ClipboardList
                            size={20}
                            className="text-violet-600"
                          />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">
                            {quiz.title}
                          </h2>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>{quiz.questionsCount} questions</span>
                            <span>•</span>
                            <span>{formatDate(quiz.updatedAt)}</span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            quiz.status === "published"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {quiz.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => onPreviewQuiz(quiz.id)}
                        className="p-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={20} />
                      </button>
                      <button
                        onClick={() =>
                          window.open(`/quiz/${quiz.id}`, "_blank")
                        }
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Open Quiz"
                      >
                        <ExternalLink size={20} />
                      </button>
                      <button
                        onClick={() => onEditQuiz(quiz.id)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => onDeleteQuiz(quiz.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredQuizzes.length === 0 && searchQuizzes && (
              <div className="text-center py-16">
                <Search size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No quizzes found
                </h3>
                <p className="text-gray-600 mb-6">
                  No quizzes match your search query "{searchQuizzes}".
                </p>
              </div>
            )}
            {quizzes.length === 0 && !searchQuizzes && (
              <div className="text-center py-16">
                <ClipboardList
                  size={64}
                  className="mx-auto text-gray-300 mb-4"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No quizzes yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create interactive quiz funnels to engage your audience
                </p>
                <button
                  onClick={onCreateQuiz}
                  className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <Plus size={20} />
                  Create Your First Quiz
                </button>
              </div>
            )}
          </>
        )}

        {/* Quiz Responses List */}
        {activeTab === "quiz-responses" && (
          <>
            {/* Search Bar for Quiz Responses */}
            <div className="mb-6">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search by name, phone, email, or answer content..."
                  value={searchQuizResponses}
                  onChange={(e) => setSearchQuizResponses(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>
            </div>
            {loadingQuizResponses ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading quiz responses...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuizResponses.length === 0 && searchQuizResponses ? (
                  <div className="text-center py-16">
                    <Search size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No quiz responses found
                    </h3>
                    <p className="text-gray-600 mb-6">
                      No quiz responses match your search query "
                      {searchQuizResponses}".
                    </p>
                  </div>
                ) : filteredQuizResponses.length === 0 &&
                  !searchQuizResponses ? (
                  <div className="text-center py-16">
                    <Users size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No quiz responses yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Responses from your published quizzes will appear here.
                    </p>
                  </div>
                ) : (
                  filteredQuizResponses.map((response) => {
                    const isExpanded = expandedQuizResponses.has(response.id);
                    return (
                      <div
                        key={response.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                      >
                        {/* Header - Always visible */}
                        <div
                          className="p-6 cursor-pointer"
                          onClick={() =>
                            toggleQuizResponse(response.id, response.quiz_id)
                          }
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {getQuizTitle(response.quiz_id)}
                                </h3>
                                <span className="text-sm text-gray-500">
                                  {formatDateTime(response.completed_at)}
                                </span>
                              </div>
                              {response.contact_info && (
                                <div className="mb-2">
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    {response.contact_info.name && (
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium">
                                          Name:
                                        </span>
                                        <span>
                                          {response.contact_info.name}
                                        </span>
                                      </div>
                                    )}
                                    {response.contact_info.email && (
                                      <div className="flex items-center gap-1">
                                        <Mail size={14} />
                                        <span>
                                          {response.contact_info.email}
                                        </span>
                                      </div>
                                    )}
                                    {response.contact_info.phone && (
                                      <div className="flex items-center gap-1">
                                        <Phone size={14} />
                                        <span>
                                          {response.contact_info.phone}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {!response.contact_info && (
                                <p className="text-gray-400 italic text-sm mb-2">
                                  No contact information provided
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>
                                  {response.answers.length} question
                                  {response.answers.length !== 1
                                    ? "s"
                                    : ""}{" "}
                                  answered
                                </span>
                                {isExpanded ? (
                                  <ChevronUp
                                    size={16}
                                    className="text-gray-400"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={16}
                                    className="text-gray-400"
                                  />
                                )}
                              </div>
                            </div>
                            <div
                              className="flex gap-2 ml-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {(response.contact_info?.email ||
                                response.contact_info?.phone) && (
                                <button
                                  onClick={() => {
                                    setSelectedResponse({
                                      id: response.id,
                                      email:
                                        response.contact_info?.email || null,
                                      phone:
                                        response.contact_info?.phone || null,
                                      subject: "Quiz Response",
                                      message: `Quiz: ${getQuizTitle(
                                        response.quiz_id
                                      )}`,
                                      post_id: null,
                                      post_author_id: null,
                                      session_id: null,
                                      created_at: response.completed_at,
                                    } as FormSubmission);
                                    setReplyModalOpen(true);
                                  }}
                                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Reply"
                                >
                                  <Reply size={20} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Content */}
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                            <p className="text-sm text-gray-600 font-medium mb-3">
                              Answers:
                            </p>
                            <div className="space-y-4">
                              {response.answers.map((answer, idx) => {
                                const questionText = getQuestionText(
                                  response.quiz_id,
                                  answer.questionId
                                );
                                const answerText = getAnswerText(
                                  response.quiz_id,
                                  answer.questionId,
                                  answer.value
                                );
                                return (
                                  <div
                                    key={idx}
                                    className="bg-gray-50 rounded-lg p-4"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                                        {idx + 1}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 mb-1">
                                          {questionText}
                                        </p>
                                        <p className="text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                                          {answerText}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* Folders Tab */}
        {activeTab === "folders" && (
          <>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Folders</h2>
              <button
                onClick={() => {
                  setEditingFolder(null);
                  setNewFolderName("");
                  setNewFolderSlug("");
                  setShowCreateFolderForm(true);
                }}
                className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus size={18} />
                New Folder
              </button>
            </div>

            {/* Create/Edit Folder Form */}
            {(editingFolder || showCreateFolderForm) && (
              <div className="mb-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingFolder ? "Edit Folder" : "Create New Folder"}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      value={editingFolder ? editingFolder.name : newFolderName}
                      onChange={(e) => {
                        if (editingFolder) {
                          setEditingFolder({
                            ...editingFolder,
                            name: e.target.value,
                          });
                        } else {
                          setNewFolderName(e.target.value);
                          if (!newFolderSlug) {
                            setNewFolderSlug(generateSlug(e.target.value));
                          }
                        }
                      }}
                      placeholder="e.g., Knees"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Folder Slug
                    </label>
                    <input
                      type="text"
                      value={editingFolder ? editingFolder.slug : newFolderSlug}
                      onChange={(e) => {
                        if (editingFolder) {
                          setEditingFolder({
                            ...editingFolder,
                            slug: e.target.value.toLowerCase().trim(),
                          });
                        } else {
                          setNewFolderSlug(e.target.value.toLowerCase().trim());
                        }
                      }}
                      placeholder="e.g., knees"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (editingFolder) {
                          await handleUpdateFolder(
                            editingFolder,
                            editingFolder.name,
                            editingFolder.slug
                          );
                        } else {
                          await handleCreateFolder();
                        }
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      {editingFolder ? "Update" : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingFolder(null);
                        setNewFolderName("");
                        setNewFolderSlug("");
                        setShowCreateFolderForm(false);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Folders List */}
            <div className="space-y-4">
              {/* User folders */}
              {folders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                  <FolderIcon
                    size={64}
                    className="mx-auto text-gray-300 mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No folders yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create a folder to organize your posts
                  </p>
                  <button
                    onClick={() => {
                      setEditingFolder(null);
                      setNewFolderName("");
                      setNewFolderSlug("");
                      setShowCreateFolderForm(true);
                    }}
                    className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Plus size={20} />
                    Create Your First Folder
                  </button>
                </div>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      if (editingFolder?.id !== folder.id) {
                        handleOpenAddPosts(folder.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <FolderIcon size={24} className="text-orange-600" />
                        <div className="flex-1">
                          {editingFolder?.id === folder.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingFolder.name}
                                onChange={(e) =>
                                  setEditingFolder({
                                    ...editingFolder,
                                    name: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-semibold"
                              />
                              <input
                                type="text"
                                value={editingFolder.slug}
                                onChange={(e) =>
                                  setEditingFolder({
                                    ...editingFolder,
                                    slug: e.target.value.toLowerCase().trim(),
                                  })
                                }
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs"
                              />
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {folder.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                  {folder.slug}
                                </code>{" "}
                                • {getFolderPostCount(folder.id)} posts
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingFolder?.id === folder.id ? (
                          <>
                            <button
                              onClick={() =>
                                handleUpdateFolder(
                                  editingFolder,
                                  editingFolder.name,
                                  editingFolder.slug
                                )
                              }
                              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingFolder(null)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddPosts(folder.id);
                              }}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                            >
                              Add Posts
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(folder);
                              }}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id);
                              }}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Reply Modal */}
        <ReplyModal
          isOpen={replyModalOpen}
          onClose={() => {
            setReplyModalOpen(false);
            setSelectedResponse(null);
          }}
          email={selectedResponse?.email || null}
          phone={selectedResponse?.phone || null}
          onSubmit={handleSendReply}
        />

        {/* Add Posts to Folder Modal */}
        {showAddPostsModal && selectedFolderForPosts && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => {
              setShowAddPostsModal(false);
              setSelectedPostIds(new Set());
              setSelectedFolderForPosts(null);
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Manage Posts in Folder
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {folders.find((f) => f.id === selectedFolderForPosts)?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddPostsModal(false);
                    setSelectedPostIds(new Set());
                    setSelectedFolderForPosts(null);
                    setSearchPostsInModal("");
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search posts by title..."
                      value={searchPostsInModal}
                      onChange={(e) => setSearchPostsInModal(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {getAvailablePosts().length === 0 ? (
                  <div className="text-center py-12">
                    <FileText
                      size={48}
                      className="mx-auto text-gray-300 mb-4"
                    />
                    <p className="text-gray-600">
                      {searchPostsInModal.trim()
                        ? `No posts found matching "${searchPostsInModal}"`
                        : "No posts available to add to this folder."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getAvailablePosts().map((post) => {
                      const isSelected = selectedPostIds.has(post.id);
                      const inFolder = isPostInFolder(post.id);
                      return (
                        <div
                          key={post.id}
                          onClick={() => togglePostSelection(post.id)}
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            inFolder
                              ? isSelected
                                ? "border-orange-500 bg-orange-50"
                                : "border-blue-300 bg-blue-50"
                              : isSelected
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center ${
                              isSelected
                                ? "border-orange-500 bg-orange-500"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <Check size={14} className="text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {post.title}
                              </h4>
                              {inFolder && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 whitespace-nowrap">
                                  In Folder
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <span>{formatDate(post.createdAt)}</span>
                              <span>•</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  post.status === "published"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {post.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {selectedPostIds.size > 0
                    ? `${selectedPostIds.size} post${
                        selectedPostIds.size > 1 ? "s" : ""
                      } selected`
                    : "No posts selected"}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddPostsModal(false);
                      setSelectedPostIds(new Set());
                      setSelectedFolderForPosts(null);
                      setSearchPostsInModal("");
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPostsToFolder}
                    disabled={addingPosts}
                    className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingPosts ? "Updating..." : "Update Folder"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
