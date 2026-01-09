/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
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

interface AnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export function AnalyticsDrawer({
  isOpen,
  onClose,
  postId,
}: AnalyticsDrawerProps) {
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
    component_order?: string[];
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

  // Get styles from post or use defaults
  const styles = post?.styles || defaultStyles;

  // Get font values
  const headingFont =
    fontOptions.find((f) => f.name === styles.headingFont)?.value ||
    styles.headingFont;
  const bodyFont =
    fontOptions.find((f) => f.name === styles.bodyFont)?.value ||
    styles.bodyFont;

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
          const match = normalizedSrc.match(/primaryColor=%23([a-fA-F0-9]{6})/);
          if (match) {
            primaryColor = `#${match[1]}`;
          }
        }
      } catch {
        // Ignore URL parsing errors
      }

      const placeholderId = `video-placeholder-${postId}-${index}`;
      const placeholder = doc.createElement("div");
      placeholder.id = placeholderId;
      placeholder.className = "video-js-placeholder";
      placeholder.setAttribute("data-video-src", normalizedSrc);
      placeholder.setAttribute("data-video-id", videoId || "");
      placeholder.setAttribute("data-primary-color", primaryColor || "");
      iframe.parentNode?.replaceChild(placeholder, iframe);
      videos.push({
        src: normalizedSrc,
        id: videoId,
        primaryColor,
        index,
        placeholderId,
      });
    });

    // Handle video tags
    videoTags.forEach((video, index) => {
      const src = video.getAttribute("src");
      if (!src) return;

      const placeholderId = `video-placeholder-${postId}-video-${index}`;
      const placeholder = doc.createElement("div");
      placeholder.id = placeholderId;
      placeholder.className = "video-js-placeholder";
      placeholder.setAttribute("data-video-src", src);
      placeholder.setAttribute("data-video-id", "");
      placeholder.setAttribute("data-primary-color", "");
      video.parentNode?.replaceChild(placeholder, video);
      videos.push({
        src,
        id: null,
        primaryColor: null,
        index: iframes.length + index,
        placeholderId,
      });
    });

    return { processedHtml: doc.body.innerHTML, extractedVideos: videos };
  }, [bodyHtml, postId]);

  // Load post and analytics data
  useEffect(() => {
    if (!isOpen || !postId) return;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load post data
        const postData = await postsApi.getById(postId);
        let templateData: PostTemplateData | null | undefined = (
          postData as any
        ).template_data;
        let bodyContent: any = postData.content || "";

        // Legacy fallback: older posts may have header embedded in HTML content
        if (
          !templateData &&
          typeof bodyContent === "string" &&
          bodyContent.trim() !== ""
        ) {
          const split = splitTemplateFromHtml(bodyContent, postData.created_at);
          templateData = split.template;
          bodyContent = split.body;
        } else {
          templateData = normalizeTemplateData(
            templateData,
            postData.created_at
          );
        }

        setPost({
          id: postData.id,
          title: postData.title,
          content: bodyContent || "",
          styles: (postData as any).styles,
          template_data: templateData,
          created_at: postData.created_at,
          quiz_id: postData.quiz_id,
          rating_enabled: (postData as any).rating_enabled,
          cta_enabled: (postData as any).cta_enabled,
          component_order: (postData as any).component_order,
        });
        setBodyHtml(bodyContent || "");
        setTemplate(templateData);

        // Load heatmap data
        const [scroll, clicks, attention, cta, rageClicks] = await Promise.all([
          heatmapsApi.getScrollData(postId),
          heatmapsApi.getClickData(postId),
          heatmapsApi.getAttentionData(postId),
          heatmapsApi.getCTAData(postId),
          heatmapsApi.getRageClickData(postId),
        ]);

        setScrollData(scroll);
        setClickData(clicks);
        setAttentionData(attention);
        setCtaData(cta);
        setRageClickData(rageClicks);
      } catch (err) {
        console.error("Error loading analytics:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load analytics"
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [isOpen, postId]);

  // Render click markers
  useEffect(() => {
    if (!isOpen || !contentContainerRef.current || clickData.length === 0)
      return;

    const container = contentContainerRef.current;
    const markers: HTMLElement[] = [];

    clickData.forEach((click) => {
      if (click.content_x !== null && click.content_y !== null) {
        const marker = document.createElement("div");
        marker.className =
          "absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-50";
        marker.style.left = `${click.content_x}px`;
        marker.style.top = `${click.content_y}px`;
        marker.title = `Click at ${click.content_x}, ${click.content_y}`;
        container.appendChild(marker);
        markers.push(marker);
      }
    });

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [isOpen, clickData, processedHtml]);

  if (!isOpen) return null;

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 h-full w-[90vw] max-w-7xl bg-gray-50 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {post?.title || "Analytics"}
            </h2>
            <p className="text-sm text-gray-600">Post Analytics & Heatmaps</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : error || !post ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Error</h3>
                <p className="text-gray-600">{error || "Post not found"}</p>
              </div>
            </div>
          ) : (
            <>
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
                  <p className="text-3xl font-bold text-gray-900">
                    {totalClicks}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="text-yellow-600" size={24} />
                    <h3 className="text-sm font-medium text-gray-600">
                      Dead Clicks
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {deadClicks}
                  </p>
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
                        totalSessions > 0
                          ? (item.count / totalSessions) * 100
                          : 0;
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
                  <h2 className="text-xl font-bold text-gray-900">
                    Click Heatmap
                  </h2>
                </div>
                {clickData.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      {clickData.length} total clicks ({deadClicks} dead clicks)
                      - Click positions shown on actual post content
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
                              className={`${
                                safeTemplate.alignment === "center"
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
                                color:
                                  safeTemplate.seriesColor || styles.textColor,
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
                                  ? fontOptions.find(
                                      (f) => f.name === safeTemplate.titleFont
                                    )?.value || safeTemplate.titleFont
                                  : headingFont,
                                fontWeight:
                                  safeTemplate.titleWeight ||
                                  styles.headingWeight,
                                fontSize: safeTemplate.titleSize || "3rem",
                                color:
                                  safeTemplate.titleColor || styles.textColor,
                              }}
                            >
                              {(safeTemplate.title || "").trim() ||
                                post.title ||
                                "Untitled Post"}
                            </h1>

                            {(safeTemplate.subtitle || "").trim() ? (
                              <p
                                className={`mb-6 italic ${
                                  safeTemplate.alignment === "center"
                                    ? "text-center"
                                    : safeTemplate.alignment === "right"
                                    ? "text-right"
                                    : "text-left"
                                }`}
                                style={{
                                  fontFamily: safeTemplate.subtitleFont
                                    ? fontOptions.find(
                                        (f) =>
                                          f.name === safeTemplate.subtitleFont
                                      )?.value || safeTemplate.subtitleFont
                                    : bodyFont,
                                  fontWeight:
                                    safeTemplate.subtitleWeight ||
                                    styles.bodyWeight,
                                  fontSize:
                                    safeTemplate.subtitleSize || "1.25rem",
                                  color:
                                    safeTemplate.subtitleColor ||
                                    styles.textColor,
                                  opacity: safeTemplate.subtitleColor ? 1 : 0.7,
                                }}
                              >
                                {(safeTemplate.subtitle || "").trim()}
                              </p>
                            ) : null}

                            <div
                              className={`text-sm ${
                                safeTemplate.alignment === "center"
                                  ? "text-center"
                                  : safeTemplate.alignment === "right"
                                  ? "text-right"
                                  : "text-left"
                              }`}
                              style={{
                                fontFamily: safeTemplate.bylineFont
                                  ? fontOptions.find(
                                      (f) => f.name === safeTemplate.bylineFont
                                    )?.value || safeTemplate.bylineFont
                                  : bodyFont,
                                fontWeight:
                                  safeTemplate.bylineWeight ||
                                  styles.bodyWeight,
                                fontSize: safeTemplate.bylineSize || "0.875rem",
                                color:
                                  safeTemplate.bylineColor || styles.textColor,
                                opacity: safeTemplate.bylineColor ? 1 : 0.6,
                              }}
                            >
                              {safeTemplate.authorName
                                ? `By ${safeTemplate.authorName}`
                                : "By Unknown"}
                              {safeTemplate.date
                                ? ` • ${new Date(
                                    safeTemplate.date
                                  ).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}`
                                : ""}
                            </div>
                          </header>

                          {/* Divider */}
                          <div className="border-t border-gray-200 mb-8"></div>

                          {/* Content */}
                          <div
                            className="preview-content prose prose-lg max-w-none"
                            dangerouslySetInnerHTML={{ __html: processedHtml }}
                            style={{
                              fontFamily: bodyFont,
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

                          {/* Divider before components */}
                          <div className="border-t border-gray-200 mt-12"></div>

                          {/* Render components in the specified order */}
                          {(
                            (post as any).component_order || [
                              "quiz",
                              "rating",
                              "cta",
                            ]
                          ).map((componentType: string) => {
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
                          })}
                        </article>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No click data available yet
                  </p>
                )}
              </div>

              {/* Attention by Section Heatmap */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="text-purple-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">
                    Attention by Section
                  </h2>
                </div>
                {attentionData.length > 0 ? (
                  <div className="space-y-4">
                    {attentionData.map((item) => (
                      <div key={item.section_id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            {item.section_id}
                          </span>
                          <span className="text-sm text-gray-600">
                            {Math.round(item.avg_time_visible_ms / 1000)}{" "}
                            seconds (avg)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                (item.avg_time_visible_ms / 60000) * 100,
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

              {/* CTA Interaction Heatmap */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="text-orange-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">
                    CTA Interaction
                  </h2>
                </div>
                {ctaData.length > 0 ? (
                  <div className="space-y-4">
                    {ctaData.map((item) => (
                      <div
                        key={item.cta_id}
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {item.cta_id}
                          </span>
                          <span className="text-sm text-gray-600">
                            {item.clicked_count} clicks / {item.seen_count} seen
                            ({item.conversion_rate.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No CTA interaction data available yet
                  </p>
                )}
              </div>

              {/* Rage Click Heatmap */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="text-red-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">
                    Rage Click Heatmap
                  </h2>
                </div>
                {rageClickData.length > 0 ? (
                  <div className="space-y-4">
                    {rageClickData.map((item, index) => (
                      <div
                        key={`rage-${index}-${item.x_percent}-${item.y_percent}`}
                        className="p-4 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Position: {item.x_percent}%, {item.y_percent}%
                          </span>
                          <span className="text-sm font-semibold text-red-600">
                            {item.totalClicks || item.click_count} clicks
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Multiple rapid clicks detected at this position
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No rage click data available yet
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
