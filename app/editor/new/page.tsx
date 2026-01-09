/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { postsApi, PostStyles } from "@/services/posts";
import { useDialog } from "@/hooks/useDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  getDefaultTemplateData,
  type PostTemplateData,
} from "@/services/postTemplate";

export default function NewEditorPage() {
  const router = useRouter();
  const { showDialog } = useDialog();
  const defaultTemplate = getDefaultTemplateData();

  const handleBack = () => {
    router.push("/dashboard");
  };

  const handlePreview = () => {
    // Preview is now handled internally in the Editor component
  };

  const handleSaveDraft = async (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent = false
  ) => {
    // For new posts, create them first as draft
    try {
      const title = template?.title || "Untitled Post";
      const createData: any = {
        title,
        content,
        status: "draft",
        template_data: template,
      };

      // Only include styles if provided
      if (styles) {
        createData.styles = styles;
      }

      const newPost = await postsApi.create(createData);
      // Update URL to include the new post ID
      router.replace(`/editor/${newPost.id}`);
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
    // For new posts, create them first as published
    try {
      const title = template?.title || "Untitled Post";
      const createData: any = {
        title,
        content,
        status: "published",
        template_data: template,
      };

      // Only include styles if provided
      if (styles) {
        createData.styles = styles;
      }

      const newPost = await postsApi.create(createData);
      // Update URL to include the new post ID
      router.replace(`/editor/${newPost.id}`);
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

  const handleSave = async (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent = false
  ) => {
    // Fallback to save as draft for backward compatibility
    await handleSaveDraft(template, content, styles, silent);
  };

  return (
    <ProtectedRoute>
      <Editor
        key="new"
        postId={undefined}
        initialTemplateData={defaultTemplate}
        initialContent={""}
        onBack={handleBack}
        onPreview={handlePreview}
        onSave={handleSave}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />
    </ProtectedRoute>
  );
}
