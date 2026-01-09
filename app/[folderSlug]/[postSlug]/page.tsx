"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { ReactionBar } from "@/components/viewer/ReactionBar";
import { CTAForm } from "@/components/viewer/CTAForm";
import { QuizRenderer } from "@/components/viewer/QuizRenderer";
import {
  VideoJsPlayer,
  extractCloudflareVideoIdFromUrl,
} from "@/components/viewer/VideoJsPlayer";
import { HeatmapTracker } from "@/components/viewer/HeatmapTracker";
import { NextArticle } from "@/components/viewer/NextArticle";
import { HydratedButton } from "@/components/viewer/HydratedButton";
import { postsApi, PostStyles, type Post } from "@/services/posts";
import {
  normalizeTemplateData,
  splitTemplateFromHtml,
  type PostTemplateData,
} from "@/services/postTemplate";

// Font options matching the editor
const fontOptions = [
  { name: "PT Serif", value: "PT Serif, Georgia, serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Merriweather", value: "Merriweather, Georgia, serif" },
  { name: "Playfair Display", value: "Playfair Display, Georgia, serif" },
  { name: "Lora", value: "Lora, Georgia, serif" },
  { name: "Inter", value: "Inter, system-ui, sans-serif" },
  { name: "Open Sans", value: "Open Sans, system-ui, sans-serif" },
  { name: "Roboto", value: "Roboto, system-ui, sans-serif" },
];

// Default styles if post doesn't have styles
const defaultStyles: PostStyles = {
  backgroundColor: "#FFFFFF",
  textColor: "#000000",
  primaryColor: "#DB2777",
  primaryTextColor: "#FFFFFF",
  secondaryColor: "#6B7280",
  linkColor: "#4746E5",
  headingFont: "PT Serif",
  headingWeight: "700",
  bodyFont: "Georgia",
  bodyWeight: "400",
};

export default function CanonicalPostPage() {
  const params = useParams();
  const folderSlug = params.folderSlug as string;
  const postSlug = params.postSlug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [template, setTemplate] = useState<PostTemplateData | null>(null);
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!folderSlug || !postSlug) return;

    try {
      setLoading(true);
      setError(null);
      const data = await postsApi.getPublicByCanonical(folderSlug, postSlug);
      const t = data.template_data;
      if (t) {
        setTemplate(normalizeTemplateData(t, data.created_at));
        setBodyHtml(data.content || "");
      } else {
        // Legacy fallback: older posts may have header embedded in HTML content
        const split = splitTemplateFromHtml(
          data.content || "",
          data.created_at
        );
        setTemplate(split.template);
        setBodyHtml(split.body || "");
      }
      setPost(data);
    } catch (err) {
      console.error("Error loading post:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load post";
      console.error("Full error details:", {
        message: errorMessage,
        error: err,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [folderSlug, postSlug]);

  useEffect(() => {
    if (folderSlug && postSlug) {
      loadPost();
    } else {
      setLoading(false);
      setError("Folder slug and post slug are required");
    }
  }, [folderSlug, postSlug, loadPost]);

  // Update page title when post loads
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Blogish`;
    } else {
      document.title = "Blogish";
    }
  }, [post]);

  // Get styles from post or use defaults
  const styles = post?.styles || defaultStyles;

  // Process HTML to replace iframes with placeholders and extract video data
  const { processedHtml, extractedVideos, extractedButtons } = useMemo(() => {
    if (typeof window === "undefined" || !bodyHtml) {
      return { processedHtml: bodyHtml, extractedVideos: [], extractedButtons: [] };
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(bodyHtml, "text/html");
    const iframes = doc.querySelectorAll<HTMLIFrameElement>(
      'iframe[src*="cloudflarestream.com"], iframe[src*="videodelivery.net"]'
    );
    const videoTags = doc.querySelectorAll<HTMLVideoElement>("video");
    const buttonDivs = doc.querySelectorAll<HTMLDivElement>('div[data-type="button"]');

    const videos: Array<{
      src: string;
      id: string | null;
      primaryColor: string | null;
      index: number;
      placeholderId: string;
      title?: string;
    }> = [];

    const buttons: Array<{
      attrs: any;
      placeholderId: string;
    }> = [];

    // Handle iframes
    iframes.forEach((iframe, index) => {
      const src = iframe.getAttribute("src");
      if (!src) return;

      const title = iframe.getAttribute("data-title") || undefined;

      const normalizedSrc = src.startsWith("http")
        ? src
        : `https://${src.replace(/^\/\//, "")}`;
      const { videoId } = extractCloudflareVideoIdFromUrl(normalizedSrc);

      // Extract primaryColor from URL
      let primaryColor: string | null = null;
      try {
        const urlObj = new URL(normalizedSrc);
        const pc = urlObj.searchParams.get("primaryColor");
        if (pc) {
          primaryColor = pc.startsWith("#") ? pc : `#${pc.replace(/^%23/, "")}`;
        } else {
          // Try regex fallback
          const match = normalizedSrc.match(/primaryColor=%23([a-fA-F0-9]{6})/);
          if (match) {
            primaryColor = `#${match[1]}`;
          }
        }
      } catch {
        // Invalid URL, try regex
        const match = normalizedSrc.match(/primaryColor=%23([a-fA-F0-9]{6})/);
        if (match) {
          primaryColor = `#${match[1]}`;
        }
      }

      if (videoId) {
        const postId = post?.id || "unknown";
        const placeholderId = `video-placeholder-${postId}-${videoId}-${index}`;
        videos.push({
          src: normalizedSrc,
          id: videoId,
          primaryColor,
          index,
          placeholderId,
          title,
        });

        // Replace iframe with placeholder div
        const placeholder = doc.createElement("div");
        placeholder.id = placeholderId;
        placeholder.className = "video-js-placeholder";
        placeholder.setAttribute("data-video-src", normalizedSrc);
        placeholder.setAttribute("data-video-id", videoId);
        if (primaryColor) {
          placeholder.setAttribute("data-primary-color", primaryColor);
        }
        iframe.parentNode?.replaceChild(placeholder, iframe);
      }
    });

    // Handle video tags
    videoTags.forEach((videoTag, index) => {
      const src =
        videoTag.getAttribute("src") ||
        videoTag.querySelector("source")?.getAttribute("src");
      if (!src) return;

      const title = videoTag.getAttribute("data-title") || undefined;

      const normalizedSrc = src.startsWith("http")
        ? src
        : `https://${src.replace(/^\/\//, "")}`;

      // For local/direct videos, we might not have a Cloudflare ID, but we can still use VideoJsPlayer
      const { videoId } = extractCloudflareVideoIdFromUrl(normalizedSrc);
      const finalVideoId = videoId || `direct-${index}`;

      const postId = post?.id || "unknown";
      const placeholderId = `video-placeholder-tag-${postId}-${finalVideoId}-${index}`;

      videos.push({
        src: normalizedSrc,
        id: finalVideoId,
        primaryColor: styles?.primaryColor || "#3B82F6",
        index: iframes.length + index,
        placeholderId,
        title,
      });

      // Replace video tag with placeholder div
      const placeholder = doc.createElement("div");
      placeholder.id = placeholderId;
      placeholder.className = "video-js-placeholder";
      placeholder.setAttribute("data-video-src", normalizedSrc);

      videoTag.parentNode?.replaceChild(placeholder, videoTag);
    });

    // Handle buttons
    buttonDivs.forEach((btnDiv, index) => {
      const postId = post?.id || "unknown";
      const placeholderId = `button-placeholder-${postId}-${index}`;

      const attrs = {
        text: btnDiv.getAttribute("text") || "",
        url: btnDiv.getAttribute("url") || "",
        variant: btnDiv.getAttribute("variant") || "solid",
        color: btnDiv.getAttribute("color") || "primary",
        customColor: btnDiv.getAttribute("customcolor"),
        size: btnDiv.getAttribute("size") || "md",
        radius: btnDiv.getAttribute("radius") || "md",
        align: btnDiv.getAttribute("align") || "center",
      };

      buttons.push({
        attrs,
        placeholderId,
      });

      // Replace button div with placeholder
      const placeholder = doc.createElement("div");
      placeholder.id = placeholderId;
      placeholder.className = "button-placeholder";
      btnDiv.parentNode?.replaceChild(placeholder, btnDiv);
    });

    return {
      processedHtml: doc.documentElement.outerHTML,
      extractedVideos: videos,
      extractedButtons: buttons,
    };
  }, [bodyHtml, post?.id, styles]);

  if (loading) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: defaultStyles.backgroundColor }}
      >
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-full mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Post Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error ||
              "The post you're looking for doesn't exist or is not published."}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Find matching font option
  const headingFontOption =
    fontOptions.find((f) => f.name === styles.headingFont) || fontOptions[0];
  const bodyFontOption =
    fontOptions.find((f) => f.name === styles.bodyFont) || fontOptions[1];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: template?.useGreenTemplate ? "#10B981" : styles.backgroundColor }}
    >
      <HeatmapTracker postId={post.id} />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Template Header */}
        {template && template.headerEnabled !== false && (
          <div
            className="mb-12"
            style={{ textAlign: template.alignment || "left" }}
          >
            {template.seriesName && template.volume && (
              <p
                className="mb-4"
                style={{
                  fontFamily: template.seriesFont || "inherit",
                  fontWeight: template.seriesWeight || "400",
                  fontSize: template.seriesSize || "0.875rem",
                  color: template.useGreenTemplate ? "#FFFFFF" : (template.seriesColor || styles.textColor),
                }}
              >
                {template.seriesName} • Volume {template.volume}
              </p>
            )}
            {template.title && (
              <h1
                className="mb-4"
                style={{
                  fontFamily: headingFontOption.value,
                  fontWeight: styles.headingWeight || "700",
                  fontSize: "2.5rem",
                  lineHeight: "1.2",
                  color: template.useGreenTemplate ? "#FFFFFF" : styles.textColor,
                }}
              >
                {template.title}
              </h1>
            )}
            {template.subtitle && (
              <p
                className="mb-6"
                style={{
                  fontFamily: bodyFontOption.value,
                  fontWeight: template.subtitleWeight || "400",
                  fontSize: template.subtitleSize || "1.125rem",
                  color: template.useGreenTemplate ? "#FFFFFF" : (template.subtitleColor || styles.textColor),
                }}
              >
                {template.subtitle}
              </p>
            )}
            {(template.authorName || template.date) && (
              <div
                className="flex items-center gap-2 text-sm"
                style={{
                  fontFamily: bodyFontOption.value,
                  fontWeight: template.bylineWeight || "400",
                  fontSize: template.bylineSize || "0.875rem",
                  color: template.useGreenTemplate ? "#FFFFFF" : (template.bylineColor || styles.secondaryColor),
                }}
              >
                {template.authorName && <span>By {template.authorName}</span>}
                {template.authorName && template.date && <span>•</span>}
                {template.date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {template.date}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content Wrapper - White card for green template */}
        <div className={template?.useGreenTemplate ? "bg-white rounded-lg p-8 shadow-lg" : ""}>
          {/* Post Content */}
          <div
            className="prose prose-lg max-w-none mb-12 preview-content"
            style={{
              fontFamily: bodyFontOption.value,
              fontWeight: styles.bodyWeight || "400",
              color: template?.useGreenTemplate ? "#000000" : styles.textColor,
              "--heading-font": headingFontOption.value,
              "--heading-weight": styles.headingWeight || "700",
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />

          {/* Videos */}
          {extractedVideos.map((video) => (
            <VideoJsPlayer
              key={video.placeholderId}
              postId={post.id}
              placeholderId={video.placeholderId}
              videoUrl={video.src}
              videoId={video.id || null}
              primaryColor={video.primaryColor || styles.primaryColor}
              videoTitle={video.title}
            />
          ))}

          {/* Buttons */}
          {extractedButtons.map((btn) => (
            <HydratedButton
              key={btn.placeholderId}
              placeholderId={btn.placeholderId}
              attrs={btn.attrs}
            />
          ))}

          {/* Components in order */}
          {post.component_order && post.component_order.length > 0 ? (
            post.component_order.map((componentType: string) => {
              if (
                componentType === "quiz" &&
                post.quiz_id &&
                post.quiz_id !== null
              ) {
                return (
                  <QuizRenderer
                    key="quiz"
                    quizId={post.quiz_id}
                    showResponsesPreview={post.quiz_show_responses_preview ?? false}
                    skipContactCollection={post.quiz_skip_contact_collection ?? false}
                    showDescription={post.quiz_show_description ?? true}
                    showResponsesButton={post.quiz_show_responses_button ?? false}
                  />
                );
              }
              if (componentType === "rating" && post.rating_enabled !== false) {
                return <ReactionBar key="rating" postId={post.id} />;
              }
              if (componentType === "cta" && post.cta_enabled !== false) {
                return <CTAForm key="cta" postId={post.id} />;
              }
              if (componentType === "nextArticle" && post.next_post_id) {
                return <NextArticle key="nextArticle" nextPostId={post.next_post_id} />;
              }
              return null;
            })
          ) : (
            <>
              {post.quiz_id && post.quiz_id !== null && (
                <QuizRenderer
                  quizId={post.quiz_id}
                  showResponsesPreview={post.quiz_show_responses_preview ?? false}
                  skipContactCollection={post.quiz_skip_contact_collection ?? false}
                  showDescription={post.quiz_show_description ?? true}
                  showResponsesButton={post.quiz_show_responses_button ?? false}
                />
              )}
              {post.rating_enabled !== false && <ReactionBar postId={post.id} />}
              {post.cta_enabled !== false && <CTAForm postId={post.id} />}
              {post.next_post_id && <NextArticle nextPostId={post.next_post_id} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
