/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from "@tiptap/core";
import { NodeSelection } from "prosemirror-state";

export interface VideoOptions {
  HTMLAttributes: Record<string, any>;
  inline: boolean;
  allowBase64: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      /**
       * Insert a Cloudflare Stream video
       */
      setVideo: (options: {
        src: string;
        align?: "left" | "center" | "right";
        width?: number;
        height?: number;
        primaryColor?: string; // Hex color for player theme (e.g., "#F48120")
        title?: string;
      }) => ReturnType;
      /**
       * Set video alignment
       */
      setVideoAlign: (align: "left" | "center" | "right") => ReturnType;
      /**
       * Set video theme color
       */
      setVideoTheme: (primaryColor: string) => ReturnType;
    };
  }
}

/**
 * Normalize URL by adding https:// if missing
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Extract Cloudflare Stream video ID and customer code from URL
 * Supports formats like:
 * - https://customer-CODE.cloudflarestream.com/VIDEO_UID/iframe
 * - customer-CODE.cloudflarestream.com/VIDEO_UID/manifest/video.m3u8
 * - https://watch.cloudflarestream.com/VIDEO_UID
 * - Direct VIDEO_UID
 */
function extractCloudflareStreamId(url: string): {
  customerCode: string | null;
  videoId: string | null;
} {
  // Normalize URL first
  const normalizedUrl = normalizeUrl(url);
  // Pattern 1: customer-CODE.cloudflarestream.com/VIDEO_UID/iframe
  let match = normalizedUrl.match(
    /customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9]+)\/iframe/
  );
  if (match && match[1] && match[2]) {
    return { customerCode: match[1], videoId: match[2] };
  }

  // Pattern 2: customer-CODE.cloudflarestream.com/VIDEO_UID/manifest/video.m3u8
  match = normalizedUrl.match(
    /customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9]+)\/manifest\/video\.m3u8/
  );
  if (match && match[1] && match[2]) {
    return { customerCode: match[1], videoId: match[2] };
  }

  // Pattern 3: customer-CODE.cloudflarestream.com/VIDEO_UID (any path after)
  match = normalizedUrl.match(
    /customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9]+)/
  );
  if (match && match[1] && match[2]) {
    return { customerCode: match[1], videoId: match[2] };
  }

  // Pattern 4: watch.cloudflarestream.com/VIDEO_UID
  match = normalizedUrl.match(/watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return { customerCode: null, videoId: match[1] };
  }

  // Pattern 5: videodelivery.net/VIDEO_UID or iframe.videodelivery.net/VIDEO_UID
  match = normalizedUrl.match(
    /(?:iframe\.)?videodelivery\.net\/([a-zA-Z0-9]+)/
  );
  if (match && match[1]) {
    return { customerCode: null, videoId: match[1] };
  }

  // Pattern 6: videodelivery.net/VIDEO_UID/manifest/video.m3u8
  match = normalizedUrl.match(
    /videodelivery\.net\/([a-zA-Z0-9]+)\/manifest\/video\.m3u8/
  );
  if (match && match[1]) {
    return { customerCode: null, videoId: match[1] };
  }

  // Pattern 7: Direct video UID (alphanumeric, typically 16+ chars)
  match = normalizedUrl.match(/\/([a-zA-Z0-9]{16,})/);
  if (match && match[1]) {
    return { customerCode: null, videoId: match[1] };
  }

  // Pattern 8: Just the video ID itself
  if (/^[a-zA-Z0-9]{16,}$/.test(url.trim())) {
    return { customerCode: null, videoId: url.trim() };
  }

  return { customerCode: null, videoId: null };
}

/**
 * Build Cloudflare Stream iframe embed URL
 */
function buildCloudflareEmbedUrl(
  videoId: string,
  customerCode: string | null = null,
  primaryColor?: string,
  options?: {
    autoplay?: boolean;
    showDuration?: boolean;
    showBackground?: boolean;
  }
): string {
  // Default customer code if not provided (you may want to set this from env)
  const code =
    customerCode || process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;
  if (!code) {
    console.error("Customer code is required for Cloudflare Stream embed URL");
    return "";
  }
  const baseUrl = `https://customer-${code}.cloudflarestream.com/${videoId}/iframe`;

  const params = new URLSearchParams();
  if (primaryColor) {
    // URLSearchParams will automatically encode # as %23
    params.append("primaryColor", primaryColor);
  }
  if (options?.autoplay !== undefined) {
    params.append("autoplay", String(options.autoplay));
  }
  if (options?.showDuration !== undefined) {
    params.append("showDuration", String(options.showDuration));
  }
  if (options?.showBackground !== undefined) {
    params.append("showBackground", String(options.showBackground));
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export const VideoExtension = Node.create<VideoOptions>({
  name: "video",

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return "block";
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          const iframe = element.querySelector("iframe");
          if (iframe) {
            return iframe.getAttribute("src");
          }
          return (
            element.getAttribute("data-src") ||
            element.getAttribute("data-video-id")
          );
        },
        renderHTML: (attributes) => {
          if (!attributes.src) {
            return {};
          }
          return {
            "data-src": attributes.src,
          };
        },
      },
      videoId: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-video-id");
        },
        renderHTML: (attributes) => {
          if (!attributes.videoId) {
            return {};
          }
          return {
            "data-video-id": attributes.videoId,
          };
        },
      },
      customerCode: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-customer-code");
        },
        renderHTML: (attributes) => {
          if (!attributes.customerCode) {
            return {};
          }
          return {
            "data-customer-code": attributes.customerCode,
          };
        },
      },
      primaryColor: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-primary-color");
        },
        renderHTML: (attributes) => {
          if (!attributes.primaryColor) {
            return {};
          }
          return {
            "data-primary-color": attributes.primaryColor,
          };
        },
      },
      align: {
        default: "center",
        parseHTML: (element) => {
          return element.getAttribute("data-align") || "center";
        },
        renderHTML: (attributes) => {
          return {
            "data-align": attributes.align || "center",
          };
        },
      },
      autoplay: {
        default: true,
        parseHTML: (element) =>
          element.getAttribute("data-autoplay") !== "false",
        renderHTML: (attributes) => ({
          "data-autoplay": attributes.autoplay,
        }),
      },
      showDuration: {
        default: true,
        parseHTML: (element) =>
          element.getAttribute("data-show-duration") !== "false",
        renderHTML: (attributes) => ({
          "data-show-duration": attributes.showDuration,
        }),
      },
      showBackground: {
        default: true,
        parseHTML: (element) =>
          element.getAttribute("data-show-background") !== "false",
        renderHTML: (attributes) => ({
          "data-show-background": attributes.showBackground,
        }),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const iframe = element.querySelector("iframe");
          if (iframe) {
            return iframe.getAttribute("width");
          }
          return element.getAttribute("data-width");
        },
        renderHTML: () => {
          return {};
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const iframe = element.querySelector("iframe");
          if (iframe) {
            return iframe.getAttribute("height");
          }
          return element.getAttribute("data-height");
        },
        renderHTML: () => {
          return {};
        },
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title") || "",
        renderHTML: (attributes) => ({
          "data-title": attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video"]',
      },
      {
        tag: "iframe[src*='cloudflarestream.com']",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const iframe = element as HTMLIFrameElement;
          const src = iframe.src;
          const { videoId } = extractCloudflareStreamId(src);
          const primaryColorMatch = src.match(
            /primaryColor=%23([a-fA-F0-9]{6})/
          );
          const primaryColor = primaryColorMatch
            ? `#${primaryColorMatch[1]}`
            : null;
          return {
            src: src,
            videoId: videoId,
            primaryColor: primaryColor,
            width: iframe.width,
            height: iframe.height,
            autoplay: iframe.getAttribute("data-autoplay") !== "false",
            showDuration: iframe.getAttribute("data-show-duration") !== "false",
            showBackground:
              iframe.getAttribute("data-show-background") !== "false",
            title: iframe.getAttribute("data-title") || "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const {
      src,
      videoId,
      customerCode,
      primaryColor,
      align,
      autoplay,
      showDuration,
      showBackground,
      title,
    } = node.attrs;
    const sourceUrl = src || HTMLAttributes.src;

    // Extract video ID and customer code from URL if not already stored
    let finalVideoId = videoId;
    let finalCustomerCode = customerCode;
    if ((!finalVideoId || !finalCustomerCode) && sourceUrl) {
      const extracted = extractCloudflareStreamId(sourceUrl);
      if (extracted.videoId) finalVideoId = extracted.videoId;
      if (extracted.customerCode) finalCustomerCode = extracted.customerCode;
    }

    if (!finalVideoId) {
      return [
        "div",
        { class: "video-error" },
        "Invalid Cloudflare Stream video URL",
      ];
    }

    if (!finalCustomerCode) {
      return [
        "div",
        { class: "video-error" },
        "Customer code not found. Please use format: customer-CODE.cloudflarestream.com/VIDEO_ID",
      ];
    }

    const embedUrl = buildCloudflareEmbedUrl(
      finalVideoId,
      finalCustomerCode,
      primaryColor,
      {
        autoplay: autoplay !== false,
        showDuration: showDuration !== false,
        showBackground: showBackground !== false,
      }
    );
    if (!embedUrl) {
      return ["div", { class: "video-error" }, "Failed to build embed URL"];
    }
    const alignmentStyle = `text-align: ${align || "center"};`;

    const wrapperAttrs = {
      class: "video-wrapper",
      "data-type": "video",
      "data-video-id": finalVideoId,
      "data-customer-code": finalCustomerCode || "",
      "data-align": align || "center",
      "data-primary-color": primaryColor || "",
      "data-autoplay": String(autoplay),
      "data-show-duration": String(showDuration),
      "data-show-background": String(showBackground),
      "data-title": title || "",
      style: alignmentStyle,
    };

    const innerAttrs = {
      class: "video-inner",
    };

    return [
      "div",
      wrapperAttrs,
      [
        "div",
        innerAttrs,
        [
          "iframe",
          {
            src: embedUrl,
            frameborder: "0",
            allow:
              "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            allowfullscreen: "true",
            style: "width: 100%; height: auto; aspect-ratio: 16 / 9;",
            // Store attributes on iframe too for easier extraction if needed
            "data-autoplay": String(autoplay),
            "data-show-duration": String(showDuration),
            "data-show-background": String(showBackground),
            "data-title": title || "",
          },
        ],
      ],
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const {
        src,
        videoId,
        customerCode,
        primaryColor,
        align,
        autoplay,
        showDuration,
        showBackground,
        title,
      } = node.attrs;

      // Extract video ID and customer code from URL if not already stored
      let finalVideoId = videoId;
      let finalCustomerCode = customerCode;
      if ((!finalVideoId || !finalCustomerCode) && src) {
        const extracted = extractCloudflareStreamId(src);
        if (extracted.videoId) finalVideoId = extracted.videoId;
        if (extracted.customerCode) finalCustomerCode = extracted.customerCode;
      }

      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-type", "video");
      wrapper.setAttribute("data-align", align || "center");
      wrapper.setAttribute("data-autoplay", String(autoplay));
      wrapper.setAttribute("data-show-duration", String(showDuration));
      wrapper.setAttribute("data-show-background", String(showBackground));
      if (title) wrapper.setAttribute("data-title", title);
      if (finalVideoId) {
        wrapper.setAttribute("data-video-id", finalVideoId);
      }
      if (finalCustomerCode) {
        wrapper.setAttribute("data-customer-code", finalCustomerCode);
      }
      if (primaryColor) {
        wrapper.setAttribute("data-primary-color", primaryColor);
      }
      wrapper.style.textAlign = align || "center";
      wrapper.style.width = "100%";
      wrapper.className = "video-wrapper";

      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (editor && typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            const { state, view } = editor;
            const { tr } = state;
            const nodeSelection = NodeSelection.create(tr.doc, pos);
            tr.setSelection(nodeSelection);
            view.dispatch(tr);
            view.focus();
          }
        }
      };

      wrapper.addEventListener("click", (e) => {
        if (e.target === wrapper) {
          handleClick(e);
        }
      });

      if (!finalVideoId) {
        const errorDiv = document.createElement("div");
        errorDiv.style.padding = "20px";
        errorDiv.style.border = "2px dashed #ccc";
        errorDiv.style.textAlign = "center";
        errorDiv.style.color = "#666";
        errorDiv.textContent = "Invalid Cloudflare Stream video URL";
        wrapper.appendChild(errorDiv);
        return {
          dom: wrapper,
        };
      }

      const embedUrl = buildCloudflareEmbedUrl(
        finalVideoId,
        finalCustomerCode,
        primaryColor,
        {
          autoplay: false, // Never autoplay in editor
          showDuration: showDuration !== false,
          showBackground: showBackground !== false,
        }
      );
      const innerDiv = document.createElement("div");
      innerDiv.className = "video-inner";
      innerDiv.style.display = "inline-block";
      innerDiv.style.position = "relative";
      innerDiv.style.lineHeight = "0";

      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.frameBorder = "0";
      iframe.setAttribute(
        "allow",
        "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      );
      iframe.allowFullscreen = true;
      iframe.style.width = "100%";
      iframe.style.height = "auto";
      iframe.style.aspectRatio = "16 / 9";
      // Disable pointer events so clicks go through to the wrapper
      iframe.style.pointerEvents = "none";
      iframe.style.userSelect = "none";
      innerDiv.appendChild(iframe);

      innerDiv.addEventListener("click", handleClick);
      wrapper.appendChild(innerDiv);

      return {
        dom: wrapper,
      };
    };
  },

  addCommands() {
    return {
      setVideo:
        (options: {
          src: string;
          align?: "left" | "center" | "right";
          width?: number;
          height?: number;
          primaryColor?: string;
          autoplay?: boolean;
          showDuration?: boolean;
          showBackground?: boolean;
          title?: string;
        }) =>
        ({ commands }) => {
          const { videoId, customerCode } = extractCloudflareStreamId(
            options.src
          );
          if (!videoId) {
            console.error(
              "Invalid Cloudflare Stream URL - video ID not found:",
              options.src
            );
            return false;
          }
          // If customer code is not in URL, use the one from environment variable
          // This handles videodelivery.net URLs which don't include customer code
          const finalCustomerCode =
            customerCode ||
            process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE ||
            null;
          if (!finalCustomerCode) {
            console.error(
              "Customer code not found in URL and NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE is not set."
            );
            console.error(
              "Please either use format: customer-CODE.cloudflarestream.com/VIDEO_ID/... or set NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE"
            );
            console.error("Original URL:", options.src);
            return false;
          }
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              videoId: videoId,
              customerCode: finalCustomerCode,
              align: options.align || "center",
              primaryColor: options.primaryColor,
              width: options.width,
              height: options.height,
              autoplay: options.autoplay !== false, // default true
              showDuration: options.showDuration !== false, // default true
              showBackground: options.showBackground !== false, // default true
              title: options.title || "",
            },
          });
        },
      setVideoAlign:
        (align: "left" | "center" | "right") =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          if (
            selection instanceof NodeSelection &&
            selection.node.type === this.type
          ) {
            const pos = selection.$anchor.pos;
            tr.setNodeMarkup(pos, undefined, {
              ...selection.node.attrs,
              align,
            });
            if (dispatch) {
              dispatch(tr);
            }
            return true;
          }
          return false;
        },
      setVideoTheme:
        (primaryColor: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          if (
            selection instanceof NodeSelection &&
            selection.node.type === this.type
          ) {
            const pos = selection.$anchor.pos;
            tr.setNodeMarkup(pos, undefined, {
              ...selection.node.attrs,
              primaryColor,
            });
            if (dispatch) {
              dispatch(tr);
            }
            return true;
          }
          return false;
        },
      setVideoSettings:
        (settings: {
          autoplay?: boolean;
          showDuration?: boolean;
          showBackground?: boolean;
          title?: string;
        }) =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state;
          if (
            selection instanceof NodeSelection &&
            selection.node.type === this.type
          ) {
            const pos = selection.$anchor.pos;
            tr.setNodeMarkup(pos, undefined, {
              ...selection.node.attrs,
              ...settings,
            });
            if (dispatch) {
              dispatch(tr);
            }
            return true;
          }
          return false;
        },
    };
  },
}).configure({
  HTMLAttributes: {
    class: "video-wrapper",
  },
});
