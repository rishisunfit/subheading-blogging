"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { ReactionBar } from "@/components/viewer/ReactionBar";
import { CTAForm } from "@/components/viewer/CTAForm";
import { QuizRenderer } from "@/components/viewer/QuizRenderer";
import {
  VideoJsPlayer,
  extractCloudflareVideoIdFromUrl,
} from "@/components/viewer/VideoJsPlayer";
import { HeatmapTracker } from "@/components/viewer/HeatmapTracker";
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

export default function PublicPostPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [template, setTemplate] = useState<PostTemplateData | null>(null);
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await postsApi.getPublicById(id);
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
  }, [id]);

  useEffect(() => {
    if (id) {
      loadPost();
    } else {
      setLoading(false);
      setError("Post ID is required");
    }
  }, [id, loadPost]);

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
  const { processedHtml, extractedVideos } = useMemo(() => {
    if (typeof window === "undefined" || !bodyHtml) {
      return { processedHtml: bodyHtml, extractedVideos: [] };
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(bodyHtml, "text/html");
    const iframes = doc.querySelectorAll<HTMLIFrameElement>(
      'iframe[src*="cloudflarestream.com"], iframe[src*="videodelivery.net"]'
    );
    const videoTags = doc.querySelectorAll<HTMLVideoElement>("video");

    const videos: Array<{
      src: string;
      id: string | null;
      primaryColor: string | null;
      index: number;
      placeholderId: string;
    }> = [];

    // Handle iframes
    iframes.forEach((iframe, index) => {
      const src = iframe.getAttribute("src");
      if (!src) return;

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
        const postId = post?.id || id || "unknown";
        const placeholderId = `video-placeholder-${postId}-${videoId}-${index}`;
        videos.push({
          src: normalizedSrc,
          id: videoId,
          primaryColor,
          index,
          placeholderId,
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

      const normalizedSrc = src.startsWith("http")
        ? src
        : `https://${src.replace(/^\/\//, "")}`;

      // For local/direct videos, we might not have a Cloudflare ID, but we can still use VideoJsPlayer
      const { videoId } = extractCloudflareVideoIdFromUrl(normalizedSrc);
      const finalVideoId = videoId || `direct-${index}`;

      const postId = post?.id || id || "unknown";
      const placeholderId = `video-placeholder-tag-${postId}-${finalVideoId}-${index}`;

      videos.push({
        src: normalizedSrc,
        id: finalVideoId,
        primaryColor: styles?.primaryColor || "#3B82F6",
        index: iframes.length + index,
        placeholderId,
      });

      // Replace video tag with placeholder div
      const placeholder = doc.createElement("div");
      placeholder.id = placeholderId;
      placeholder.className = "video-js-placeholder";
      placeholder.setAttribute("data-video-src", normalizedSrc);

      videoTag.parentNode?.replaceChild(placeholder, videoTag);
    });

    return {
      processedHtml: doc.documentElement.outerHTML,
      extractedVideos: videos,
    };
  }, [bodyHtml, post?.id, id, styles]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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

  // Get font values
  const headingFont =
    fontOptions.find((f) => f.name === styles.headingFont)?.value ||
    styles.headingFont;
  const bodyFont =
    fontOptions.find((f) => f.name === styles.bodyFont)?.value ||
    styles.bodyFont;

  const safeTemplate = normalizeTemplateData(template, post.created_at);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.textColor,
      }}
    >
      {/* Heatmap Tracker */}
      <HeatmapTracker postId={post.id} />

      {/* Article */}
      <article
        className="max-w-3xl mx-auto px-4 py-12"
        style={{
          fontFamily: bodyFont,
          fontWeight: styles.bodyWeight,
        }}
      >
        {/* Header (from template_data with legacy fallback) */}
        {safeTemplate.headerEnabled !== false && (
          <header className="mb-8">
            <div
              className={`${
                safeTemplate.alignment === "center"
                  ? "text-center"
                  : safeTemplate.alignment === "right"
                  ? "text-right"
                  : "text-left"
              } tracking-[0.18em] uppercase mb-4`}
              style={{
                fontFamily: safeTemplate.seriesFont
                  ? fontOptions.find((f) => f.name === safeTemplate.seriesFont)
                      ?.value || safeTemplate.seriesFont
                  : undefined,
                fontWeight: safeTemplate.seriesWeight || "700",
                fontSize: safeTemplate.seriesSize || "0.75rem",
                color: safeTemplate.seriesColor || styles.textColor,
                opacity: safeTemplate.seriesColor ? 1 : 0.8,
              }}
            >
              {(safeTemplate.seriesName || "").trim()}
              {(safeTemplate.seriesName || "").trim() &&
              (safeTemplate.volume || "").trim()
                ? " • "
                : ""}
              {(safeTemplate.volume || "").trim() || ""}
            </div>

            <h1
              className={`mb-4 ${
                safeTemplate.alignment === "center"
                  ? "text-center"
                  : safeTemplate.alignment === "right"
                  ? "text-right"
                  : "text-left"
              }`}
              style={{
                fontFamily: safeTemplate.titleFont
                  ? fontOptions.find((f) => f.name === safeTemplate.titleFont)
                      ?.value || safeTemplate.titleFont
                  : headingFont,
                fontWeight: safeTemplate.titleWeight || styles.headingWeight,
                fontSize: safeTemplate.titleSize || "3rem",
                color: safeTemplate.titleColor || styles.textColor,
              }}
            >
              {(safeTemplate.title || "").trim() ||
                post.title ||
                "Untitled Post"}
            </h1>

            {(safeTemplate.subtitle || "").trim() ? (
              <p
                className={`italic mb-6 ${
                  safeTemplate.alignment === "center"
                    ? "text-center"
                    : safeTemplate.alignment === "right"
                    ? "text-right"
                    : "text-left"
                }`}
                style={{
                  fontFamily: safeTemplate.subtitleFont
                    ? fontOptions.find(
                        (f) => f.name === safeTemplate.subtitleFont
                      )?.value || safeTemplate.subtitleFont
                    : undefined,
                  fontWeight: safeTemplate.subtitleWeight || undefined,
                  fontSize: safeTemplate.subtitleSize || "1.25rem",
                  color: safeTemplate.subtitleColor || styles.textColor,
                  opacity: safeTemplate.subtitleColor ? 1 : 0.9,
                }}
              >
                {safeTemplate.subtitle}
              </p>
            ) : null}

            {(safeTemplate.authorName || "").trim() ||
            (safeTemplate.date || "").trim() ? (
              <div
                className={`${
                  safeTemplate.alignment === "center"
                    ? "text-center"
                    : safeTemplate.alignment === "right"
                    ? "text-right"
                    : "text-left"
                } tracking-[0.14em] uppercase border-b pb-4`}
                style={{
                  fontFamily: safeTemplate.bylineFont
                    ? fontOptions.find(
                        (f) => f.name === safeTemplate.bylineFont
                      )?.value || safeTemplate.bylineFont
                    : undefined,
                  fontWeight: safeTemplate.bylineWeight || "700",
                  fontSize: safeTemplate.bylineSize || "0.75rem",
                  color: safeTemplate.bylineColor || styles.textColor,
                  opacity: safeTemplate.bylineColor ? 1 : 0.8,
                  borderColor: styles.textColor,
                }}
              >
                {(safeTemplate.authorName || "").trim()
                  ? `By ${safeTemplate.authorName}`
                  : ""}
                {(safeTemplate.authorName || "").trim() &&
                (safeTemplate.date || formatDate(new Date(post.created_at)))
                  ? " • "
                  : ""}
                {safeTemplate.date || formatDate(new Date(post.created_at))}
              </div>
            ) : (
              <div
                className="border-b pb-4"
                style={{ opacity: 0.2, borderColor: styles.textColor }}
              />
            )}
          </header>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none"
          style={{
            color: styles.textColor,
            lineHeight: "1.75",
            fontFamily: bodyFont,
            fontWeight: styles.bodyWeight,
          }}
        >
          {bodyHtml ? (
            <>
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                                    .preview-content h1,
                                    .preview-content h2,
                                    .preview-content h3,
                                    .preview-content h4,
                                    .preview-content h5,
                                    .preview-content h6 {
                                        font-family: ${headingFont};
                                        font-weight: ${styles.headingWeight};
                                        color: ${styles.textColor};
                                    }
                                    .preview-content a {
                                        color: ${styles.linkColor};
                                    }
                                    .preview-content blockquote {
                                        border-left-color: ${styles.textColor};
                                        color: ${styles.textColor};
                                    }
                                    .preview-content code {
                                        background-color: ${
                                          styles.backgroundColor === "#FFFFFF"
                                            ? "#F3F4F6"
                                            : "rgba(0,0,0,0.1)"
                                        };
                                    }
                                    /* Hide original video iframes - replaced by Video.js players */
                                    .preview-content iframe[src*="cloudflarestream.com"],
                                    .preview-content iframe[src*="videodelivery.net"] {
                                        display: none !important;
                                    }
                                    /* Style video placeholders */
                                    .preview-content .video-js-placeholder {
                                        display: block;
                                        width: 80%;
                                        max-width: 760px;
                                        aspect-ratio: 16 / 9;
                                        background-color: #000;
                                        border-radius: 0.5rem;
                                        overflow: hidden;
                                        position: relative;
                                        margin: 1.5rem auto;
                                    }
                                `,
                }}
              />
              <div
                dangerouslySetInnerHTML={{ __html: processedHtml }}
                className="preview-content"
                style={{
                  fontFamily: bodyFont,
                  fontWeight: styles.bodyWeight,
                }}
              />
              {/* Mount Video.js players in their placeholder positions */}
              {extractedVideos.map((video) => (
                <VideoJsPlayer
                  key={`videojs-${post?.id || id}-${video.id}-${video.index}`}
                  postId={post?.id || id}
                  videoUrl={video.src}
                  videoId={video.id}
                  primaryColor={video.primaryColor}
                  placeholderId={video.placeholderId}
                />
              ))}
            </>
          ) : (
            <p
              style={{
                color: styles.textColor,
                opacity: 0.6,
                fontStyle: "italic",
              }}
            >
              No content available.
            </p>
          )}
        </div>

        {/* Divider before components */}
        <div className="border-t border-gray-200 mt-12"></div>

        {/* Render components in the specified order */}
        {(post.component_order || ["quiz", "rating", "cta"]).map(
          (componentType: string) => {
            if (componentType === "quiz" && post.quiz_id) {
              return (
                <QuizRenderer
                  key={`quiz-${post.quiz_id}`}
                  quizId={post.quiz_id}
                  skipInlineScan={true}
                />
              );
            }
            if (componentType === "rating" && post.rating_enabled !== false) {
              return <ReactionBar key={`rating-${post.id}`} postId={post.id} />;
            }
            if (componentType === "cta" && post.cta_enabled !== false) {
              return (
                <CTAForm
                  key={`cta-${post.id}`}
                  postId={post.id}
                  quizId={post.quiz_id}
                />
              );
            }
            return null;
          }
        )}

        {/* Footer */}
        <footer
          className="mt-16 pt-8 border-t"
          style={{
            borderColor: styles.textColor,
            opacity: 0.2,
          }}
        >
          <p
            className="text-center"
            style={{
              color: styles.textColor,
              opacity: 0.7,
            }}
          >
            Built with <span style={{ color: styles.primaryColor }}>♥</span>{" "}
            using Blogish
          </p>
        </footer>
      </article>
    </div>
  );
}
