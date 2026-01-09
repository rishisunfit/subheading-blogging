/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { DashboardShimmer } from "@/components/DashboardShimmer";
import { Editor } from "@/components/editor/Editor";
import { Preview } from "@/components/viewer/Preview";
import { postsApi } from "@/services/posts";
import { useAuth } from "@/hooks/useAuth";
import { useDialog } from "@/hooks/useDialog";
import type { Post as DbPost, PostStyles } from "@/services/posts";
import {
  getDefaultTemplateData,
  normalizeTemplateData,
  splitTemplateFromHtml,
  type PostTemplateData,
} from "@/services/postTemplate";

type View = "dashboard" | "editor" | "preview";

// Helper to convert DB post to UI format
const convertPost = (post: DbPost) => ({
  id: post.id,
  title: post.title,
  content: post.content,
  createdAt: new Date(post.created_at),
  updatedAt: new Date(post.updated_at),
  status: post.status as "draft" | "published",
  styles: post.styles,
  template_data: post.template_data,
});

export function AppContent() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [currentPost, setCurrentPost] = useState<ReturnType<
    typeof convertPost
  > | null>(null);
  const [posts, setPosts] = useState<ReturnType<typeof convertPost>[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPost, setCreatingPost] = useState(false);
  const { signOut, profile } = useAuth();
  const router = useRouter();
  const { showDialog } = useDialog();

  // Load posts from Supabase on mount
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await postsApi.getAll();
      setPosts(data.map(convertPost));
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (creatingPost) return; // Prevent multiple clicks

    setCreatingPost(true);
    try {
      const template = getDefaultTemplateData();
      const newPost = await postsApi.create({
        title: template.title || "Untitled Post",
        content: "",
        status: "draft",
        template_data: template,
      });
      const convertedPost = convertPost(newPost);

      // Update posts list to include the new post
      setPosts((prevPosts) => [convertedPost, ...prevPosts]);

      setCurrentPost(convertedPost);
      setCurrentView("editor");
    } catch (error) {
      console.error("Error creating post:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create post";
      await showDialog({
        type: "alert",
        message: `Failed to create post: ${errorMessage}`,
        title: "Error",
      });
    } finally {
      setCreatingPost(false);
    }
  };

  const handleEditPost = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setCurrentPost(post);
      setCurrentView("editor");
    }
  };

  const handleSavePost = async (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent = false
  ) => {
    if (!currentPost) return;

    try {
      const title = template?.title || "Untitled Post";
      const updateData: any = { title, content, template_data: template };
      if (styles) updateData.styles = styles;

      const updatedPost = await postsApi.update(currentPost.id, updateData);

      const converted = convertPost(updatedPost);
      setCurrentPost(converted);

      // Update local state
      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.id === currentPost.id ? converted : p))
      );

      if (!silent) {
        await showDialog({
          type: "alert",
          message: "Post saved successfully!",
          title: "Success",
        });
      }
    } catch (error) {
      console.error("Error saving post:", error);
      await showDialog({
        type: "alert",
        message: "Failed to save post",
        title: "Error",
      });
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setCurrentPost(null);
  };

  const handlePreview = () => {
    setCurrentView("preview");
  };

  const handleBackToEditor = () => {
    setCurrentView("editor");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <DashboardShimmer />;
  }

  return (
    <>
      {currentView === "dashboard" && (
        <>
          {/* Header with user info and logout - only on dashboard */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Blogish</h1>
                {profile?.name && (
                  <p className="text-sm text-gray-600">
                    Welcome, {profile.name}
                  </p>
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
        </>
      )}

      {currentView === "dashboard" && (
        <Dashboard
          onCreatePost={handleCreatePost}
          onEditPost={handleEditPost}
          posts={posts}
          isCreating={creatingPost}
          onDeletePost={async (id) => {
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
          }}
        />
      )}

      {currentView === "editor" &&
        currentPost &&
        (() => {
          const created = currentPost.createdAt?.toISOString?.() || undefined;
          const derived = currentPost.template_data
            ? {
                template: normalizeTemplateData(
                  currentPost.template_data as any,
                  created
                ),
                body: currentPost.content || "",
              }
            : splitTemplateFromHtml(currentPost.content || "", created);

          return (
            <Editor
              postId={currentPost.id}
              initialTemplateData={derived.template}
              initialContent={derived.body}
              onBack={handleBackToDashboard}
              onPreview={handlePreview}
              onSave={handleSavePost}
            />
          );
        })()}

      {currentView === "preview" && currentPost && (
        <Preview
          title={currentPost.title}
          content={currentPost.content}
          date={currentPost.createdAt}
          postId={currentPost.id}
          onBack={handleBackToEditor}
        />
      )}
    </>
  );
}
