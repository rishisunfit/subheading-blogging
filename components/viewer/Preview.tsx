import { ArrowLeft } from "lucide-react";
import { ReactionBar } from "./ReactionBar";
import { CTAForm } from "./CTAForm";
import { QuizRenderer } from "./QuizRenderer";
import { VideoJsPlayer, extractCloudflareVideoIdFromUrl } from "./VideoJsPlayer";
import { NextArticle } from "./NextArticle";
import { HydratedButton } from "./HydratedButton";
import { PostTemplateData } from "@/services/postTemplate";
import { useMemo } from "react";

interface PreviewProps {
  title: string;
  content: string;
  date?: Date;
  postId?: string;
  quizId?: string | null;
  templateData?: PostTemplateData;
  nextPostId?: string | null;
  onBack: () => void;
}

export function Preview({
  title,
  content,
  date = new Date(),
  postId,
  quizId,
  templateData,
  nextPostId,
  onBack,
}: PreviewProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Process HTML to extract videos and replace with placeholders
  const { processedHtml, extractedVideos, extractedButtons } = useMemo(() => {
    if (typeof window === "undefined" || !content) {
      return { processedHtml: content, extractedVideos: [], extractedButtons: [] };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const iframes = doc.querySelectorAll<HTMLIFrameElement>(
      'iframe[src*="cloudflarestream.com"], iframe[src*="videodelivery.net"]'
    );
    const buttonDivs = doc.querySelectorAll<HTMLDivElement>('div[data-type="button"]');

    const videos: Array<{
      src: string;
      id: string | null;
      primaryColor: string | null;
      placeholderId: string;
    }> = [];

    const buttons: Array<{
      attrs: any;
      placeholderId: string;
    }> = [];

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
        }
      } catch {
        const match = normalizedSrc.match(/primaryColor=%23([a-fA-F0-9]{6})/);
        if (match) {
          primaryColor = `#${match[1]}`;
        }
      }

      if (videoId) {
        const placeholderId = `preview-video-${videoId}-${index}`;
        videos.push({
          src: normalizedSrc,
          id: videoId,
          primaryColor,
          placeholderId,
        });

        // Replace iframe with placeholder div
        const placeholder = doc.createElement("div");
        placeholder.id = placeholderId;
        placeholder.className = "video-js-placeholder";
        iframe.parentNode?.replaceChild(placeholder, iframe);
      }
    });

    // Handle buttons
    buttonDivs.forEach((btnDiv, index) => {
      const uniqueId = `preview-button-${index}-${Date.now()}`;
      const placeholderId = uniqueId;

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
  }, [content]);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: templateData?.useGreenTemplate ? "#10B981" : "#FFFFFF" }}
    >
      {/* Navigation */}
      <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Editor
          </button>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Template Header - Display when using templateData */}
        {templateData && templateData.headerEnabled !== false && (
          <header className={`mb-12 ${templateData.useGreenTemplate ? "text-white" : ""}`}>
            {templateData.seriesName && templateData.volume && (
              <div className="text-center text-xs uppercase tracking-wider mb-4">
                {templateData.seriesName} • {templateData.volume}
              </div>
            )}
            {templateData.title && (
              <h1 className="text-center text-5xl font-bold mb-4">
                {templateData.title}
              </h1>
            )}
            {templateData.subtitle && (
              <p className="text-center text-lg italic mb-6">
                {templateData.subtitle}
              </p>
            )}
            {(templateData.authorName || templateData.date) && (
              <div className="text-center text-xs uppercase tracking-wider border-b pb-4 mb-12">
                {templateData.authorName && `By ${templateData.authorName}`}
                {templateData.authorName && templateData.date && " • "}
                {templateData.date || formatDate(date)}
              </div>
            )}
          </header>
        )}

        {/* Content - Wrapped in white card if green template is active */}
        <div className={templateData?.useGreenTemplate ? "bg-white rounded-lg p-8 shadow-lg" : ""}>
          {/* Content */}
          <div
            className="prose prose-lg max-w-none"
            style={{
              color: "rgb(17 24 39)",
              lineHeight: "1.75",
            }}
          >
            {content ? (
              <div
                dangerouslySetInnerHTML={{ __html: processedHtml }}
                className="preview-content"
              />
            ) : (
              <p className="text-gray-400 italic">
                No content yet. Start writing in the editor!
              </p>
            )}
          </div>

          {/* Render VideoJsPlayer components */}
          {extractedVideos.map((video) => (
            <VideoJsPlayer
              key={video.placeholderId}
              postId={postId || "preview"}
              placeholderId={video.placeholderId}
              videoUrl={video.src}
              videoId={video.id}
              primaryColor={video.primaryColor}
            />
          ))}

          {/* Render HydratedButtons */}
          {extractedButtons.map((btn) => (
            <HydratedButton
              key={btn.placeholderId}
              placeholderId={btn.placeholderId}
              attrs={btn.attrs}
            />
          ))}

          {/* Quiz CTA (if enabled) */}
          {quizId && <QuizRenderer quizId={quizId} />}

          {/* Reaction Bar */}
          <ReactionBar postId={postId} />

          {/* CTA Form */}
          <CTAForm postId={postId} quizId={quizId} />

          {/* Next Article */}
          {nextPostId && <NextArticle nextPostId={nextPostId} />}
        </div>

        {/* Footer */}
        <footer className={`mt-16 pt-8 border-t ${templateData?.useGreenTemplate ? "border-white/20 text-white" : "border-gray-200"}`}>
          <p className="text-center">
            Built with <span className="text-red-500">♥</span> using Blogish
          </p>
        </footer>
      </article>
    </div>
  );
}
