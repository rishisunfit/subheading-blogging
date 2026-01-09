import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  ClipboardList,
  Check,
  Search,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Plus,
  Link as LinkIcon,
} from "lucide-react";
import { quizzesApi } from "@/services/quizzes";
import type { Quiz } from "@/types/quiz";
import { foldersApi, generateSlug, type Folder } from "@/services/folders";
import { postsApi, type Post } from "@/services/posts";

interface PostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string | null;
  ratingEnabled: boolean;
  ctaEnabled: boolean;
  componentOrder?: string[];
  folderId?: string | null;
  postSlug?: string | null;
  nextPostId?: string | null;
  currentPostId?: string | null;
  quizShowResponsesPreview?: boolean;
  quizSkipContactCollection?: boolean;
  quizShowDescription?: boolean;
  quizShowResponsesButton?: boolean;
  onSave: (
    quizId: string | null,
    ratingEnabled: boolean,
    ctaEnabled: boolean,
    componentOrder: string[],
    folderId: string | null,
    postSlug: string | null,
    nextPostId: string | null,
    quizShowResponsesPreview: boolean,
    quizSkipContactCollection: boolean,
    quizShowDescription: boolean,
    quizShowResponsesButton: boolean
  ) => void;
}

export function PostSettingsModal({
  isOpen,
  onClose,
  quizId,
  ratingEnabled,
  ctaEnabled,
  componentOrder = ["quiz", "rating", "cta", "nextArticle"],
  folderId,
  postSlug,
  nextPostId,
  currentPostId,
  quizShowResponsesPreview = false,
  quizSkipContactCollection = false,
  quizShowDescription = true,
  quizShowResponsesButton = false,
  onSave,
}: PostSettingsModalProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(quizId);
  const [quizEnabled, setQuizEnabled] = useState(!!quizId);
  const [ratingEnabledState, setRatingEnabledState] = useState(ratingEnabled);
  const [ctaEnabledState, setCtaEnabledState] = useState(ctaEnabled);
  const [componentOrderState, setComponentOrderState] = useState<string[]>(
    componentOrder || ["quiz", "rating", "cta"]
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Quiz settings state
  const [showResponsesPreview, setShowResponsesPreview] = useState(quizShowResponsesPreview);
  const [skipContactCollection, setSkipContactCollection] = useState(quizSkipContactCollection);
  const [showDescription, setShowDescription] = useState(quizShowDescription);
  const [showResponsesButton, setShowResponsesButton] = useState(quizShowResponsesButton);

  // Folder and slug state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    folderId || null
  );
  const [postSlugState, setPostSlugState] = useState<string>(postSlug || "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderSlug, setNewFolderSlug] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Next Article state
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedNextPostId, setSelectedNextPostId] = useState<string | null>(nextPostId || null);
  const [nextArticleEnabled, setNextArticleEnabled] = useState(!!nextPostId);
  const [postSearchQuery, setPostSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadQuizzes();
      loadFolders();
      loadPosts();
      setSelectedQuizId(quizId);
      setQuizEnabled(!!quizId);
      setRatingEnabledState(ratingEnabled);
      setCtaEnabledState(ctaEnabled);
      setShowResponsesPreview(quizShowResponsesPreview);
      setSkipContactCollection(quizSkipContactCollection);
      setShowDescription(quizShowDescription);
      setShowResponsesButton(quizShowResponsesButton);

      // Ensure nextArticle is in the component order
      const order = componentOrder || ["quiz", "rating", "cta", "nextArticle"];
      if (!order.includes("nextArticle")) {
        order.push("nextArticle");
      }
      setComponentOrderState(order);

      setSelectedFolderId(folderId || null);
      setPostSlugState(postSlug || "");
      setSelectedNextPostId(nextPostId || null);
      setNextArticleEnabled(!!nextPostId);
      setSlugError(null);
      setShowCreateFolder(false);
      setNewFolderName("");
      setNewFolderSlug("");
    }
  }, [
    isOpen,
    quizId,
    ratingEnabled,
    ctaEnabled,
    componentOrder,
    folderId,
    postSlug,
    nextPostId,
    quizShowResponsesPreview,
    quizSkipContactCollection,
    quizShowDescription,
    quizShowResponsesButton,
  ]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await quizzesApi.getAll();
      // Sort by updated_at descending and take first 5
      const sorted = data.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setAllQuizzes(sorted);
      setQuizzes(sorted.slice(0, 5));
    } catch (err) {
      console.error("Error loading quizzes:", err);
      setError(err instanceof Error ? err.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  // Filter quizzes based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show 5 most recent when no search
      setQuizzes(allQuizzes.slice(0, 5));
    } else {
      // Filter by search query
      const filtered = allQuizzes.filter((quiz) =>
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setQuizzes(filtered);
    }
  }, [searchQuery, allQuizzes]);

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      const data = await postsApi.getAll();
      // Filter out current post and sort by updated_at descending
      const filtered = data
        .filter((p) => p.id !== currentPostId)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      setAllPosts(filtered);
      setPosts(filtered.slice(0, 5));
    } catch (err) {
      console.error("Error loading posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Filter posts based on search query
  useEffect(() => {
    if (!postSearchQuery.trim()) {
      // Show 5 most recent when no search
      setPosts(allPosts.slice(0, 5));
    } else {
      // Filter by search query
      const filtered = allPosts.filter((post) =>
        post.title.toLowerCase().includes(postSearchQuery.toLowerCase())
      );
      setPosts(filtered);
    }
  }, [postSearchQuery, allPosts]);

  const loadFolders = async () => {
    try {
      setLoadingFolders(true);
      const data = await foldersApi.getAll();
      setFolders(data);
    } catch (err) {
      console.error("Error loading folders:", err);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setCreatingFolder(true);
      const slug = newFolderSlug.trim() || generateSlug(newFolderName);
      const folder = await foldersApi.create({
        name: newFolderName.trim(),
        slug,
      });
      setFolders([...folders, folder]);
      setSelectedFolderId(folder.id);
      setNewFolderName("");
      setNewFolderSlug("");
      setShowCreateFolder(false);
    } catch (err) {
      console.error("Error creating folder:", err);
      setSlugError(
        err instanceof Error ? err.message : "Failed to create folder"
      );
    } finally {
      setCreatingFolder(false);
    }
  };

  const validateSlug = (slug: string): boolean => {
    if (!slug.trim()) {
      setSlugError(null);
      return true; // Empty is OK if no folder selected
    }
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      setSlugError(
        "Slug can only contain lowercase letters, numbers, and hyphens"
      );
      return false;
    }
    setSlugError(null);
    return true;
  };

  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().trim();
    setPostSlugState(slug);
    validateSlug(slug);
  };

  const handleSave = () => {
    // Validate slug if folder is selected
    if (selectedFolderId && !postSlugState.trim()) {
      setSlugError("Post slug is required when a folder is selected");
      return;
    }
    if (postSlugState.trim() && !validateSlug(postSlugState)) {
      return;
    }

    // Validate quiz selection
    if (quizEnabled && !selectedQuizId) {
      setError("Please select a quiz to enable the Quiz Funnel");
      return;
    }

    onSave(
      quizEnabled ? selectedQuizId : null,
      ratingEnabledState,
      ctaEnabledState,
      componentOrderState,
      selectedFolderId,
      postSlugState.trim() || null,
      nextArticleEnabled ? selectedNextPostId : null,
      quizEnabled ? showResponsesPreview : false,
      quizEnabled ? skipContactCollection : false,
      quizEnabled ? showDescription : true,
      quizEnabled ? showResponsesButton : false
    );
    onClose();
  };

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const canonicalUrl =
    selectedFolder && postSlugState.trim()
      ? `/${selectedFolder.slug}/${postSlugState.trim()}`
      : null;

  const moveComponent = (index: number, direction: "up" | "down") => {
    const newOrder = [...componentOrderState];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [
      newOrder[targetIndex],
      newOrder[index],
    ];
    setComponentOrderState(newOrder);
  };

  const getComponentLabel = (type: string): string => {
    switch (type) {
      case "quiz":
        return "Quiz";
      case "rating":
        return "Rating/Reaction Bar";
      case "cta":
        return "Have a Question Form";
      case "nextArticle":
        return "Next Article";
      default:
        return type;
    }
  };

  const isComponentEnabled = (type: string): boolean => {
    switch (type) {
      case "quiz":
        return quizEnabled;
      case "rating":
        return ratingEnabledState;
      case "cta":
        return ctaEnabledState;
      case "nextArticle":
        return nextArticleEnabled;
      default:
        return false;
    }
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
          <h3 className="text-xl font-bold text-gray-900">Post Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Quiz Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">
                  Quiz Funnel
                </h4>
                <p className="text-sm text-gray-600">
                  Add a quiz that will appear at the bottom of your post, after
                  the contact form.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quizEnabled}
                  onChange={(e) => {
                    setQuizEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedQuizId(null);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {quizEnabled && (
              <div className="mt-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                      onClick={loadQuizzes}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : allQuizzes.length === 0 ? (
                  <div className="text-center py-8 border border-gray-200 rounded-lg">
                    <ClipboardList
                      size={32}
                      className="mx-auto text-gray-300 mb-2"
                    />
                    <p className="text-gray-600 text-sm mb-1">
                      No quizzes found
                    </p>
                    <p className="text-xs text-gray-500">
                      Create a quiz first to link it to this post
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Search Input */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search
                          size={18}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search quizzes..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Quiz List */}
                    {quizzes.length === 0 ? (
                      <div className="text-center py-8 border border-gray-200 rounded-lg">
                        <p className="text-gray-600 text-sm">
                          No quizzes found matching "{searchQuery}"
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {quizzes.map((quiz) => (
                          <button
                            key={quiz.id}
                            onClick={() => setSelectedQuizId(quiz.id)}
                            className={`w-full text-left p-4 border rounded-lg transition-colors ${selectedQuizId === quiz.id
                              ? "border-violet-500 bg-violet-50"
                              : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/50"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-semibold text-gray-900">
                                    {quiz.title}
                                  </h5>
                                  {selectedQuizId === quiz.id && (
                                    <Check
                                      size={16}
                                      className="text-violet-600"
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span>{quiz.questions.length} questions</span>
                                  <span>•</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${quiz.status === "published"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                      }`}
                                  >
                                    {quiz.status}
                                  </span>
                                </div>
                              </div>
                              <ClipboardList
                                size={20}
                                className={`ml-4 ${selectedQuizId === quiz.id
                                  ? "text-violet-600"
                                  : "text-gray-400"
                                  }`}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quiz Settings (only visible when quiz is enabled and selected) */}
          {quizEnabled && selectedQuizId && (
            <div className="mb-6 ml-4 pl-4 border-l-2 border-violet-200">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Quiz Display Options</h5>

              {/* Show Responses Preview */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Show Responses Preview</p>
                  <p className="text-xs text-gray-500">
                    Display a summary of user&apos;s answers before showing results
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResponsesPreview}
                    onChange={(e) => setShowResponsesPreview(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              {/* Skip Contact Collection */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Skip Contact Collection</p>
                  <p className="text-xs text-gray-500">
                    Don&apos;t ask for contact info on this post (overrides quiz settings)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipContactCollection}
                    onChange={(e) => setSkipContactCollection(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              {/* Show Quiz Description */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Show Description</p>
                  <p className="text-xs text-gray-500">
                    Show the quiz description on the cover page
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDescription}
                    onChange={(e) => setShowDescription(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              {/* Show Responses Button */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Show 'My Responses' Button</p>
                  <p className="text-xs text-gray-500">
                    Allow users to view their previous answers if they've taken the quiz
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResponsesButton}
                    onChange={(e) => setShowResponsesButton(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Rating Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">
                  Rating/Reaction Bar
                </h4>
                <p className="text-sm text-gray-600">
                  Enable a rating bar that appears at the bottom of your post,
                  allowing readers to rate your content.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ratingEnabledState}
                  onChange={(e) => {
                    setRatingEnabledState(e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">
                  Have a Question Form
                </h4>
                <p className="text-sm text-gray-600">
                  Enable a contact form that appears at the bottom of your post,
                  allowing readers to send you questions.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ctaEnabledState}
                  onChange={(e) => {
                    setCtaEnabledState(e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>
          </div>

          {/* Next Article Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">
                  Next Article
                </h4>
                <p className="text-sm text-gray-600">
                  Add a link to the next article that readers should read after this one.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={nextArticleEnabled}
                  onChange={(e) => {
                    setNextArticleEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedNextPostId(null);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {nextArticleEnabled && (
              <div className="mt-4">
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  </div>
                ) : allPosts.length === 0 ? (
                  <div className="text-center py-8 border border-gray-200 rounded-lg">
                    <LinkIcon
                      size={32}
                      className="mx-auto text-gray-300 mb-2"
                    />
                    <p className="text-gray-600 text-sm mb-1">
                      No other posts found
                    </p>
                    <p className="text-xs text-gray-500">
                      Create more posts to link them together
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Search Input */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search
                          size={18}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          value={postSearchQuery}
                          onChange={(e) => setPostSearchQuery(e.target.value)}
                          placeholder="Search posts..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Post List */}
                    {posts.length === 0 ? (
                      <div className="text-center py-8 border border-gray-200 rounded-lg">
                        <p className="text-gray-600 text-sm">
                          No posts found matching "{postSearchQuery}"
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {posts.map((post) => (
                          <button
                            key={post.id}
                            onClick={() => setSelectedNextPostId(post.id)}
                            className={`w-full text-left p-4 border rounded-lg transition-colors ${selectedNextPostId === post.id
                              ? "border-violet-500 bg-violet-50"
                              : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/50"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-semibold text-gray-900">
                                    {post.title}
                                  </h5>
                                  {selectedNextPostId === post.id && (
                                    <Check
                                      size={16}
                                      className="text-violet-600"
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span>
                                    {new Date(post.updated_at).toLocaleDateString()}
                                  </span>
                                  <span>•</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${post.status === "published"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                      }`}
                                  >
                                    {post.status}
                                  </span>
                                </div>
                              </div>
                              <LinkIcon
                                size={20}
                                className={`ml-4 ${selectedNextPostId === post.id
                                  ? "text-violet-600"
                                  : "text-gray-400"
                                  }`}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* URL & Folder Section */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              URL & Folder
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Organize your post into a folder and set a custom URL slug. The
              canonical URL will be:{" "}
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                /{"{"}folder-slug{"}"}/{"{"}post-slug{"}"}
              </code>
            </p>

            {/* Folder Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder
              </label>
              {loadingFolders ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedFolderId || ""}
                    onChange={(e) => {
                      setSelectedFolderId(e.target.value || null);
                      if (!e.target.value) {
                        setPostSlugState("");
                        setSlugError(null);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">Unfiled</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>

                  {!showCreateFolder ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateFolder(true)}
                      className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700"
                    >
                      <Plus size={16} />
                      Create new folder
                    </button>
                  ) : (
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Folder Name
                        </label>
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => {
                            setNewFolderName(e.target.value);
                            if (!newFolderSlug) {
                              setNewFolderSlug(generateSlug(e.target.value));
                            }
                          }}
                          placeholder="e.g., Knees"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Folder Slug
                        </label>
                        <input
                          type="text"
                          value={newFolderSlug}
                          onChange={(e) =>
                            setNewFolderSlug(
                              e.target.value.toLowerCase().trim()
                            )
                          }
                          placeholder="e.g., knees"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateFolder}
                          disabled={creatingFolder || !newFolderName.trim()}
                          className="flex-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {creatingFolder ? "Creating..." : "Create"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateFolder(false);
                            setNewFolderName("");
                            setNewFolderSlug("");
                          }}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Post Slug Input */}
            {selectedFolderId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post Slug <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <LinkIcon
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={postSlugState}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="e.g., knee-strengthening"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm ${slugError ? "border-red-300" : "border-gray-300"
                        }`}
                    />
                  </div>
                  {slugError && (
                    <p className="text-xs text-red-600">{slugError}</p>
                  )}
                  {canonicalUrl && !slugError && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Canonical URL:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-violet-700 font-mono">
                        {canonicalUrl}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Component Order Section */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Component Order
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Reorder the components that appear at the bottom of your post.
              Only enabled components will be displayed.
            </p>
            <div className="space-y-2">
              {componentOrderState.map((component, index) => {
                const enabled = isComponentEnabled(component);
                return (
                  <div
                    key={component}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 ${enabled
                      ? "bg-white border-violet-200"
                      : "bg-gray-50 border-gray-200 opacity-60"
                      }`}
                  >
                    <GripVertical className="text-gray-400" size={20} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {getComponentLabel(component)}
                      </div>
                      {!enabled && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          (Disabled)
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveComponent(index, "up")}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp size={16} className="text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveComponent(index, "down")}
                        disabled={index === componentOrderState.length - 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              (quizEnabled && !selectedQuizId) ||
              (selectedFolderId && !postSlugState.trim()) ||
              !!slugError
            }
            className="px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
