"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  MousePointerClick,
  Eye,
  Target,
  AlertTriangle,
} from "lucide-react";
import {
  heatmapsApi,
  type ScrollHeatmapData,
  type ClickHeatmapData,
  type AttentionHeatmapData,
  type CTAHeatmapData,
  type RageClickHeatmapData,
} from "@/services/heatmaps";
import { postsApi, PostStyles } from "@/services/posts";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  splitTemplateFromHtml,
  normalizeTemplateData,
  type PostTemplateData,
} from "@/services/postTemplate";
import { ReactionBar } from "@/components/viewer/ReactionBar";
import { CTAForm } from "@/components/viewer/CTAForm";
import { QuizRenderer } from "@/components/viewer/QuizRenderer";
import {
  VideoJsPlayer,
  extractCloudflareVideoIdFromUrl,
} from "@/components/viewer/VideoJsPlayer";

// Font options matching the editor
const fontOptions = [
  { name: "PT Serif", value: "PT Serif, Georgia, serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Merriweather", value: "Merriweather, Georgia, serif" },
  { name: "Playfair Display", value: "Playfair Display, Georgia, serif" },
  { name: "Lora", value: "Lora, Georgia, serif" },
  { name: "Inter", value: "Inter, system-ui, sans-serif" },
  { name: "Open Sans", value: "Open Sans, system-ui, sans-serif" },
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

export default function PostAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const contentContainerRef = useRef<HTMLElement | null>(null);

  const [post, setPost] = useState<{
    id: string;
    title: string;
    content: string;
    styles?: PostStyles;
    template_data?: PostTemplateData | null;
    created_at: string;
    quiz_id: string | null;
    rating_enabled?: boolean;
    cta_enabled?: boolean;
    component_order?: string[] | null;
  } | null>(null);
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [template, setTemplate] = useState<PostTemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Heatmap data states
  const [scrollData, setScrollData] = useState<ScrollHeatmapData[]>([]);
  const [clickData, setClickData] = useState<ClickHeatmapData[]>([]);
  const [attentionData, setAttentionData] = useState<AttentionHeatmapData[]>(
    []
  );
  const [ctaData, setCtaData] = useState<CTAHeatmapData[]>([]);
  const [rageClickData, setRageClickData] = useState<RageClickHeatmapData[]>(
    []
  );

  // Get styles from post or use defaults (must be before early returns)
  const styles = post?.styles || defaultStyles;

  // Get font values (must be before early returns)
  const headingFont =
    fontOptions.find((f) => f.name === styles.headingFont)?.value ||
    styles.headingFont;
  const bodyFont =
    fontOptions.find((f) => f.name === styles.bodyFont)?.value ||
    styles.bodyFont;

  // Process HTML to replace iframes with placeholders and extract video data (must be before early returns)
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
          const match = normalizedSrc.match(/primaryColor=%23([a-fA-F0-9]{6})/);
          if (match) {
            primaryColor = `#${match[1]}`;
          }
        }
      } catch {
        const match = normalizedSrc.match(/primaryColor=%23([a-fA-F0-9]{6})/);
        if (match) {
          primaryColor = `#${match[1]}`;
        }
      }

      if (videoId) {
        const currentPostId = post?.id || postId || "unknown";
        const placeholderId = `video-placeholder-analytics-${currentPostId}-${videoId}-${index}`;
        videos.push({
          src: normalizedSrc,
          id: videoId,
          primaryColor,
          index,
          placeholderId,
        });

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
      const { videoId } = extractCloudflareVideoIdFromUrl(normalizedSrc);
      const finalVideoId = videoId || `direct-${index}`;

      const currentPostId = post?.id || postId || "unknown";
      const placeholderId = `video-placeholder-analytics-tag-${currentPostId}-${finalVideoId}-${index}`;

      videos.push({
        src: normalizedSrc,
        id: finalVideoId,
        primaryColor: styles?.primaryColor || "#3B82F6",
        index: iframes.length + index,
        placeholderId,
      });

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
  }, [bodyHtml, post?.id, postId, styles]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load post info with full content
      const postData = await postsApi.getById(postId);
      const { body, template: extractedTemplate } = splitTemplateFromHtml(
        postData.content || "",
        postData.created_at
      );
      setPost({
        id: postData.id,
        title: postData.title,
        content: postData.content,
        styles: postData.styles,
        template_data: postData.template_data,
        created_at: postData.created_at,
        quiz_id: postData.quiz_id,
      });
      setBodyHtml(body);
      setTemplate(extractedTemplate);

      // Load all heatmap data in parallel
      const [scroll, clicks, attention, cta, rageClicks] = await Promise.all([
        heatmapsApi.getScrollData(postId).catch(() => []),
        heatmapsApi.getClickData(postId).catch(() => []),
        heatmapsApi.getAttentionData(postId).catch(() => []),
        heatmapsApi.getCTAData(postId).catch(() => []),
        heatmapsApi.getRageClickData(postId).catch(() => []),
      ]);

      setScrollData(scroll);
      setClickData(clicks);
      setAttentionData(attention);
      setCtaData(cta);
      setRageClickData(rageClicks);
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      loadData();
    }
  }, [postId, loadData]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !post) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-6">{error || "Post not found"}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const totalSessions = scrollData.reduce((sum, item) => sum + item.count, 0);
  const totalClicks = clickData.length;
  const deadClicks = clickData.filter((c) => c.is_dead_click).length;
  const totalRageClicks = rageClickData.reduce(
    (sum, item) => sum + (item.totalClicks || item.click_count),
    0
  );

  const safeTemplate = post
    ? normalizeTemplateData(template || post.template_data, post.created_at)
    : null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {post.title}
            </h1>
            <p className="text-gray-600">Post Analytics & Heatmaps</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="text-blue-600" size={24} />
                <h3 className="text-sm font-medium text-gray-600">
                  Total Sessions
                </h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {totalSessions}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <MousePointerClick className="text-green-600" size={24} />
                <h3 className="text-sm font-medium text-gray-600">
                  Total Clicks
                </h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalClicks}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-yellow-600" size={24} />
                <h3 className="text-sm font-medium text-gray-600">
                  Dead Clicks
                </h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{deadClicks}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-red-600" size={24} />
                <h3 className="text-sm font-medium text-gray-600">
                  Rage Clicks
                </h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {totalRageClicks}
              </p>
            </div>
          </div>

          {/* Scroll Depth Heatmap */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">
                Scroll Depth Heatmap
              </h2>
            </div>
            {scrollData.length > 0 ? (
              <div className="space-y-4">
                {scrollData.map((item) => {
                  const percentage =
                    totalSessions > 0 ? (item.count / totalSessions) * 100 : 0;
                  return (
                    <div key={item.scroll_bucket} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          {item.scroll_bucket}%
                        </span>
                        <span className="text-sm text-gray-600">
                          {item.count} sessions
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No scroll data available yet
              </p>
            )}
          </div>

          {/* Click Heatmap - Rendered Post with Overlays */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <MousePointerClick className="text-green-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Click Heatmap</h2>
            </div>
            {clickData.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {clickData.length} total clicks ({deadClicks} dead clicks) -
                  Click positions shown on actual post content
                </p>
                {post && bodyHtml && safeTemplate && (
                  <div
                    className="relative border border-gray-200 rounded-lg overflow-hidden"
                    style={{
                      backgroundColor: styles.backgroundColor,
                      color: styles.textColor,
                    }}
                  >
                    {/* Render the full post page */}
                    <article
                      ref={(el) => {
                        if (el) contentContainerRef.current = el;
                      }}
                      className="max-w-3xl mx-auto px-4 py-12 relative"
                      style={{
                        fontFamily: bodyFont,
                        fontWeight: styles.bodyWeight,
                      }}
                    >
                      {/* Header */}
                      <header className="mb-8">
                        <div
                          className={`${safeTemplate.alignment === "center"
                              ? "text-center"
                              : safeTemplate.alignment === "right"
                                ? "text-right"
                                : "text-left"
                            } tracking-[0.18em] uppercase mb-4`}
                          style={{
                            fontFamily: safeTemplate.seriesFont
                              ? fontOptions.find(
                                (f) => f.name === safeTemplate.seriesFont
                              )?.value || safeTemplate.seriesFont
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
                          className={`mb-4 ${safeTemplate.alignment === "center"
                              ? "text-center"
                              : safeTemplate.alignment === "right"
                                ? "text-right"
                                : "text-left"
                            }`}
                          style={{
                            fontFamily: safeTemplate.titleFont
                              ? fontOptions.find(
                                (f) => f.name === safeTemplate.titleFont
                              )?.value || safeTemplate.titleFont
                              : headingFont,
                            fontWeight:
                              safeTemplate.titleWeight || styles.headingWeight,
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
                            className={`italic mb-6 ${safeTemplate.alignment === "center"
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
                              fontWeight:
                                safeTemplate.subtitleWeight || undefined,
                              fontSize: safeTemplate.subtitleSize || "1.25rem",
                              color:
                                safeTemplate.subtitleColor || styles.textColor,
                              opacity: safeTemplate.subtitleColor ? 1 : 0.9,
                            }}
                          >
                            {safeTemplate.subtitle}
                          </p>
                        ) : null}

                        {(safeTemplate.authorName || "").trim() ||
                          (safeTemplate.date || "").trim() ? (
                          <div
                            className={`${safeTemplate.alignment === "center"
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
                              color:
                                safeTemplate.bylineColor || styles.textColor,
                              opacity: safeTemplate.bylineColor ? 1 : 0.8,
                              borderColor: styles.textColor,
                            }}
                          >
                            {(safeTemplate.authorName || "").trim()
                              ? `By ${safeTemplate.authorName}`
                              : ""}
                            {(safeTemplate.authorName || "").trim() &&
                              (safeTemplate.date ||
                                formatDate(new Date(post.created_at)))
                              ? " • "
                              : ""}
                            {safeTemplate.date ||
                              formatDate(new Date(post.created_at))}
                          </div>
                        ) : (
                          <div
                            className="border-b pb-4"
                            style={{
                              opacity: 0.2,
                              borderColor: styles.textColor,
                            }}
                          />
                        )}
                      </header>

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
                                                            font-weight: ${styles.headingWeight
                              };
                                                            color: ${styles.textColor
                              };
                                                        }
                                                        .preview-content a {
                                                            color: ${styles.linkColor
                              };
                                                        }
                                                        .preview-content blockquote {
                                                            border-left-color: ${styles.textColor
                              };
                                                            color: ${styles.textColor
                              };
                                                        }
                                                        .preview-content code {
                                                            background-color: ${styles.backgroundColor ===
                                "#FFFFFF"
                                ? "#F3F4F6"
                                : "rgba(0,0,0,0.1)"
                              };
                                                        }
                                                        .preview-content iframe[src*="cloudflarestream.com"],
                                                        .preview-content iframe[src*="videodelivery.net"] {
                                                            display: none !important;
                                                        }
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
                            key={`videojs-analytics-${post.id}-${video.id}-${video.index}`}
                            postId={post.id}
                            videoUrl={video.src}
                            videoId={video.id}
                            primaryColor={video.primaryColor}
                            placeholderId={video.placeholderId}
                          />
                        ))}
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
                          if (
                            componentType === "rating" &&
                            post.rating_enabled !== false
                          ) {
                            return (
                              <ReactionBar
                                key={`rating-${post.id}`}
                                postId={post.id}
                              />
                            );
                          }
                          if (
                            componentType === "cta" &&
                            post.cta_enabled !== false
                          ) {
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
                          Built with{" "}
                          <span style={{ color: styles.primaryColor }}>♥</span>{" "}
                          using Blogish
                        </p>
                      </footer>

                      {/* Overlay clicks on the rendered content */}
                      {clickData
                        .filter(
                          (click) =>
                            click.content_x !== null && click.content_y !== null
                        )
                        .map((click, index) => {
                          // Use content-relative coordinates if available
                          const x = click.content_x ?? 0;
                          const y = click.content_y ?? 0;

                          return (
                            <div
                              key={index}
                              className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none z-50 ${click.is_dead_click
                                  ? "bg-red-500"
                                  : "bg-green-500"
                                }`}
                              style={{
                                left: `${x}px`,
                                top: `${y}px`,
                                transform: "translate(-50%, -50%)",
                              }}
                              title={`${click.is_dead_click ? "Dead click" : "Click"
                                } at (${x}, ${y})`}
                            />
                          );
                        })}
                    </article>
                  </div>
                )}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                    <span className="text-gray-600">Valid Clicks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
                    <span className="text-gray-600">Dead Clicks</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No click data available yet
              </p>
            )}
          </div>

          {/* Attention by Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="text-purple-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">
                Attention by Section
              </h2>
            </div>
            {attentionData.length > 0 ? (
              <div className="space-y-4">
                {attentionData
                  .sort((a, b) => b.avg_time_visible_ms - a.avg_time_visible_ms)
                  .map((item) => (
                    <div key={item.section_id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {item.section_id.replace(/-/g, " ")}
                        </span>
                        <div className="flex gap-4 text-xs text-gray-600">
                          <span>{item.unique_sessions} sessions</span>
                          <span>
                            {Math.round(item.avg_time_visible_ms / 1000)}s avg
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              (item.avg_time_visible_ms / 30000) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No attention data available yet
              </p>
            )}
          </div>

          {/* CTA Interactions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="text-orange-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">
                CTA Interactions
              </h2>
            </div>
            {ctaData.length > 0 ? (
              <div className="space-y-4">
                {ctaData.map((item) => (
                  <div key={item.cta_id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {item.cta_id.replace(/-/g, " ")}
                      </span>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>{item.seen_count} seen</span>
                        <span>{item.clicked_count} clicked</span>
                        <span className="font-semibold">
                          {item.conversion_rate.toFixed(1)}% conversion
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-orange-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${item.conversion_rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No CTA data available yet
              </p>
            )}
          </div>

          {/* Rage Clicks */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="text-red-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">
                Rage Click Indicators
              </h2>
            </div>
            {rageClickData.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-4">
                  {rageClickData.length} rage click locations detected
                </p>
                <div
                  className="relative bg-gray-100 rounded-lg p-4"
                  style={{ aspectRatio: "16/9", minHeight: "400px" }}
                >
                  {rageClickData.map((rage, index) => {
                    const intensity = Math.min(
                      (rage.click_count / 10) * 100,
                      100
                    );
                    return (
                      <div
                        key={index}
                        className="absolute rounded-full bg-red-500 opacity-70"
                        style={{
                          left: `${rage.x_percent}%`,
                          top: `${rage.y_percent}%`,
                          width: `${Math.max(intensity / 5, 20)}px`,
                          height: `${Math.max(intensity / 5, 20)}px`,
                          transform: "translate(-50%, -50%)",
                        }}
                        title={`${rage.click_count} rage clicks at ${Math.round(
                          rage.x_percent
                        )}%, ${Math.round(rage.y_percent)}%`}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No rage click data available yet
              </p>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
