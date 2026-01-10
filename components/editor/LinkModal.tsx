import { useState, useEffect } from "react";
import { X, ExternalLink, FileText, Search } from "lucide-react";
import { postsApi, type Post } from "@/services/posts";

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLink: (url: string) => void;
  previousUrl?: string;
}

export function LinkModal({
  isOpen,
  onClose,
  onInsertLink,
  previousUrl = "",
}: LinkModalProps) {
  const [selectedTab, setSelectedTab] = useState<"external" | "blog">("external");
  const [externalUrl, setExternalUrl] = useState(previousUrl);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setExternalUrl(previousUrl);
      loadPosts();
    }
  }, [isOpen, previousUrl]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await postsApi.getAll();
      setPosts(data.filter((p) => p.status === "published"));
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (selectedTab === "external") {
      if (!externalUrl.trim()) {
        alert("Please enter a URL");
        return;
      }
      // Add https:// if no protocol specified
      const url = externalUrl.match(/^https?:\/\//)
        ? externalUrl
        : `https://${externalUrl}`;
      onInsertLink(url);
    }
    onClose();
    // Reset state
    setExternalUrl("");
    setSearchQuery("");
    setSelectedTab("external");
  };

  const handleSelectPost = (post: Post) => {
    // Build the link to the blog post as relative path
    // Format: /folder-slug/post-slug (with leading slash for valid relative URL)
    const url = post.folder_slug && post.post_slug
      ? `/${post.folder_slug}/${post.post_slug}`
      : `/${post.id}`; // Fallback to just the ID if no slugs available
    onInsertLink(url);
    onClose();
    // Reset state
    setExternalUrl("");
    setSearchQuery("");
    setSelectedTab("external");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Add Link</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setSelectedTab("external")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${selectedTab === "external"
              ? "text-blue-600 border-b-2 border-blue-600 bg-white"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
          >
            <ExternalLink className="inline mr-2" size={16} />
            External Link
          </button>
          <button
            onClick={() => setSelectedTab("blog")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${selectedTab === "blog"
              ? "text-blue-600 border-b-2 border-blue-600 bg-white"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
          >
            <FileText className="inline mr-2" size={16} />
            Link to Blog Post
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTab === "external" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter URL
                </label>
                <input
                  type="text"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmit();
                    }
                  }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter a full URL starting with https:// or we'll add it for you
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your blog posts..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Posts List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading your posts...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600">
                    {searchQuery
                      ? "No posts found matching your search"
                      : "No published posts available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => handleSelectPost(post)}
                      className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {post.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(post.updated_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <ExternalLink
                          size={16}
                          className="text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-2"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTab === "external" && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
            >
              Insert Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
