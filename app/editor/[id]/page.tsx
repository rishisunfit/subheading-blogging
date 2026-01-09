/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { postsApi } from "@/services/posts";
import { useDialog } from "@/hooks/useDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EditorShimmer } from "@/components/EditorShimmer";
import {
  normalizeTemplateData,
  splitTemplateFromHtml,
  type PostTemplateData,
} from "@/services/postTemplate";

import type { Post, PostStyles } from "@/services/posts";

type PostWithStyles = Post & {
  styles?: PostStyles;
};

export default function EditorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { showDialog } = useDialog();
  const [post, setPost] = useState<PostWithStyles | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [ratingEnabled, setRatingEnabled] = useState<boolean>(true);
  const [ctaEnabled, setCtaEnabled] = useState<boolean>(true);
  const [componentOrder, setComponentOrder] = useState<string[]>([
    "quiz",
    "rating",
    "cta",
    "nextArticle",
  ]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [postSlug, setPostSlug] = useState<string | null>(null);
  const [nextPostId, setNextPostId] = useState<string | null>(null);
  const [quizShowResponsesPreview, setQuizShowResponsesPreview] = useState<boolean>(false);
  const [quizSkipContactCollection, setQuizSkipContactCollection] = useState<boolean>(false);
  const [quizShowDescription, setQuizShowDescription] = useState<boolean>(true);
  const [quizShowResponsesButton, setQuizShowResponsesButton] = useState<boolean>(false);

  const loadPost = useCallback(async () => {
    if (!id) return;

    try {
      const data = await postsApi.getById(id);
      // Derive template/header data
      let template: PostTemplateData | null | undefined = (data as any)
        .template_data;
      let bodyContent: any = data.content || "";

      // Legacy fallback: older posts may have header embedded in HTML content
      if (
        !template &&
        typeof bodyContent === "string" &&
        bodyContent.trim() !== ""
      ) {
        const split = splitTemplateFromHtml(bodyContent, data.created_at);
        template = split.template;
        bodyContent = split.body;
      } else {
        template = normalizeTemplateData(template, data.created_at);
      }

      // Ensure editor body does not include the header section
      (data as any).template_data = template;
      data.content = bodyContent || "";

      // Keep posts.title in sync for dashboard lists
      if (!data.title || data.title === "Untitled Post") {
        const t = (template?.title || "").trim();
        if (t) data.title = t;
      }

      setPost(data);
      setQuizId(data.quiz_id);
      setRatingEnabled((data as any).rating_enabled !== false);
      setCtaEnabled((data as any).cta_enabled !== false);
      setComponentOrder(
        (data as any).component_order || ["quiz", "rating", "cta", "nextArticle"]
      );
      setFolderId((data as any).folder_id || null);
      setPostSlug((data as any).post_slug || null);
      setNextPostId((data as any).next_post_id || null);
      setQuizShowResponsesPreview((data as any).quiz_show_responses_preview || false);
      setQuizSkipContactCollection((data as any).quiz_skip_contact_collection || false);
      setQuizShowDescription((data as any).quiz_show_description ?? true);
      setQuizShowResponsesButton((data as any).quiz_show_responses_button || false);
    } catch (error) {
      console.error("Error loading post:", error);
      await showDialog({
        type: "alert",
        message: "Failed to load post",
        title: "Error",
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router, showDialog]);

  useEffect(() => {
    if (id) {
      loadPost();
    } else {
      setLoading(false);
      setPost(null);
    }
  }, [id, loadPost]);

  const handleBack = () => {
    router.push("/dashboard");
  };

  const handlePreview = () => {
    // Preview is now handled internally in the Editor component
    // This function can be empty or used for other purposes
  };

  const handleUpdateQuizId = async (newQuizId: string | null) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        quiz_id: newQuizId,
      });
      setQuizId(newQuizId);
      await loadPost();
    } catch (error) {
      console.error("Error updating quiz:", error);
    }
  };

  const handleUpdateRatingEnabled = async (enabled: boolean) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        rating_enabled: enabled,
      });
      setRatingEnabled(enabled);
      await loadPost();
    } catch (error) {
      console.error("Error updating rating:", error);
    }
  };

  const handleUpdateCtaEnabled = async (enabled: boolean) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        cta_enabled: enabled,
      });
      setCtaEnabled(enabled);
      await loadPost();
    } catch (error) {
      console.error("Error updating CTA:", error);
    }
  };

  const handleUpdateComponentOrder = async (order: string[]) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        component_order: order,
      });
      setComponentOrder(order);
      await loadPost();
    } catch (error) {
      console.error("Error updating component order:", error);
    }
  };

  const handleUpdateFolderId = async (newFolderId: string | null) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        folder_id: newFolderId,
      });
      setFolderId(newFolderId);
      await loadPost();
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

  const handleUpdatePostSlug = async (newPostSlug: string | null) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        post_slug: newPostSlug,
      });
      setPostSlug(newPostSlug);
      await loadPost();
    } catch (error) {
      console.error("Error updating post slug:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update post slug";
      // Check for unique constraint violation
      if (
        errorMessage.includes("unique") ||
        errorMessage.includes("duplicate")
      ) {
        await showDialog({
          type: "alert",
          message:
            "A post with this slug already exists in this folder. Please choose a different slug.",
          title: "Slug Conflict",
        });
      } else {
        await showDialog({
          type: "alert",
          message: errorMessage,
          title: "Error",
        });
      }
    }
  };

  const handleUpdateNextPostId = async (newNextPostId: string | null) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        next_post_id: newNextPostId,
      });
      setNextPostId(newNextPostId);
      await loadPost();
    } catch (error) {
      console.error("Error updating next post:", error);
      await showDialog({
        type: "alert",
        message:
          error instanceof Error ? error.message : "Failed to update next post",
        title: "Error",
      });
    }
  };

  const handleUpdateQuizShowResponsesPreview = async (enabled: boolean) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        quiz_show_responses_preview: enabled,
      });
      setQuizShowResponsesPreview(enabled);
      await loadPost();
    } catch (error) {
      console.error("Error updating quiz responses preview:", error);
    }
  };

  const handleUpdateQuizSkipContactCollection = async (enabled: boolean) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        quiz_skip_contact_collection: enabled,
      });
      setQuizSkipContactCollection(enabled);
      await loadPost();
    } catch (error) {
      console.error("Error updating quiz skip contact:", error);
    }
  };

  const handleUpdateQuizShowDescription = async (enabled: boolean) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        quiz_show_description: enabled,
      });
      setQuizShowDescription(enabled);
      await loadPost();
    } catch (error) {
      console.error("Error updating quiz show description:", error);
    }
  };

  const handleUpdateQuizShowResponsesButton = async (enabled: boolean) => {
    if (!id) return;
    try {
      await postsApi.update(id, {
        quiz_show_responses_button: enabled,
      });
      setQuizShowResponsesButton(enabled);
      await loadPost();
    } catch (error) {
      console.error("Error updating quiz show responses button:", error);
    }
  };

  const handleSaveDraft = async (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent = false
  ) => {
    if (!id) return;

    try {
      const title = template?.title || "Untitled Post";
      const updateData: any = {
        title,
        content,
        status: "draft",
        is_draft: true,
        quiz_id: quizId,
        rating_enabled: ratingEnabled,
        cta_enabled: ctaEnabled,
        component_order: componentOrder,
        template_data: template,
        next_post_id: nextPostId,
      };

      // Only include styles if provided and not empty
      if (styles) {
        updateData.styles = styles;
      }

      await postsApi.update(id, updateData);

      // Reload post data to get latest
      await loadPost();

      if (!silent) {
        await showDialog({
          type: "alert",
          message: "Post saved as draft!",
          title: "Success",
        });
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      let errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a database column error
      if (
        errorMessage.includes("column") &&
        errorMessage.includes("does not exist")
      ) {
        errorMessage =
          "Database migration required. Please run the migration to add the 'styles' column to the posts table. See migrations/add_styles_to_posts.sql";
      }

      await showDialog({
        type: "alert",
        message: `Failed to save draft: ${errorMessage}`,
        title: "Error",
      });
    }
  };

  const handlePublish = async (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent = false
  ) => {
    if (!id) return;

    try {
      const title = template?.title || "Untitled Post";
      const updateData: any = {
        title,
        content,
        status: "published",
        is_draft: false,
        quiz_id: quizId,
        rating_enabled: ratingEnabled,
        cta_enabled: ctaEnabled,
        component_order: componentOrder,
        template_data: template,
        next_post_id: nextPostId,
      };

      // Only include styles if provided and not empty
      if (styles) {
        updateData.styles = styles;
      }

      await postsApi.update(id, updateData);

      // Reload post data to get latest
      await loadPost();

      if (!silent) {
        await showDialog({
          type: "alert",
          message: "Post published successfully!",
          title: "Success",
        });
      }
    } catch (error) {
      console.error("Error publishing post:", error);
      let errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a database column error
      if (
        errorMessage.includes("column") &&
        errorMessage.includes("does not exist")
      ) {
        errorMessage =
          "Database migration required. Please run the migration to add the 'styles' column to the posts table. See migrations/add_styles_to_posts.sql";
      }

      await showDialog({
        type: "alert",
        message: `Failed to publish post: ${errorMessage}`,
        title: "Error",
      });
    }
  };

  const handleAutoSave = async (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent = true
  ) => {
    // Auto-save that preserves the current post status
    if (!id || !post) return;

    try {
      const title = template?.title || "Untitled Post";
      const updateData: any = {
        title,
        content,
        // Preserve current status instead of forcing draft
        status: post.status || "draft",
        is_draft:
          post.status === "draft" || post.is_draft === true ? true : false,
        quiz_id: quizId,
        rating_enabled: ratingEnabled,
        cta_enabled: ctaEnabled,
        component_order: componentOrder,
        template_data: template,
        next_post_id: nextPostId,
      };

      // Only include styles if provided and not empty
      if (styles) {
        updateData.styles = styles;
      }

      await postsApi.update(id, updateData);

      // Reload post data to get latest
      await loadPost();
    } catch (error) {
      console.error("Error auto-saving:", error);
      // Don't show error dialog for silent auto-saves
      if (!silent) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await showDialog({
          type: "alert",
          message: `Failed to save: ${errorMessage}`,
          title: "Error",
        });
      }
    }
  };

  const handleSave = async (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent = false
  ) => {
    // Fallback to save as draft for backward compatibility
    await handleSaveDraft(template, content, styles, silent);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <EditorShimmer />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Editor
        key={post?.id || "new"}
        postId={id}
        initialTemplateData={(post as any)?.template_data}
        initialContent={post?.content || ""}
        initialQuizId={post?.quiz_id || null}
        initialRatingEnabled={ratingEnabled}
        initialCtaEnabled={ctaEnabled}
        initialComponentOrder={componentOrder}
        initialStyles={post?.styles}
        initialFolderId={folderId}
        initialPostSlug={postSlug}
        initialNextPostId={nextPostId}
        initialQuizShowResponsesPreview={quizShowResponsesPreview}
        initialQuizSkipContactCollection={quizSkipContactCollection}
        initialQuizShowDescription={quizShowDescription}
        initialQuizShowResponsesButton={quizShowResponsesButton}
        onBack={handleBack}
        onPreview={handlePreview}
        onSave={handleSave}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onAutoSave={handleAutoSave}
        onUpdateQuizId={handleUpdateQuizId}
        onUpdateRatingEnabled={handleUpdateRatingEnabled}
        onUpdateCtaEnabled={handleUpdateCtaEnabled}
        onUpdateComponentOrder={handleUpdateComponentOrder}
        onUpdateFolderId={handleUpdateFolderId}
        onUpdatePostSlug={handleUpdatePostSlug}
        onUpdateNextPostId={handleUpdateNextPostId}
        onUpdateQuizShowResponsesPreview={handleUpdateQuizShowResponsesPreview}
        onUpdateQuizSkipContactCollection={handleUpdateQuizSkipContactCollection}
        onUpdateQuizShowDescription={handleUpdateQuizShowDescription}
        onUpdateQuizShowResponsesButton={handleUpdateQuizShowResponsesButton}
      />
    </ProtectedRoute>
  );
}
