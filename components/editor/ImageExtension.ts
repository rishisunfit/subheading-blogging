/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { NodeSelection } from "prosemirror-state";

export const ImageExtension = Image.extend({
  parseHTML() {
    return [
      {
        tag: 'figure[data-type="image"]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const img = element.querySelector("img");
          if (!img) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width:
              img.getAttribute("width") ||
              (img as HTMLElement).style.width ||
              null,
            height:
              img.getAttribute("height") ||
              (img as HTMLElement).style.height ||
              null,
            align:
              element.getAttribute("data-align") ||
              (element as HTMLElement).style.textAlign ||
              "center",
            source_url: element.getAttribute("data-source-url") || null,
            source_name: element.getAttribute("data-source-name") || null,
            license_note: element.getAttribute("data-license-note") || null,
            year: element.getAttribute("data-year") || null,
            show_attribution:
              (element.getAttribute("data-show-attribution") ?? "true") ===
              "true",
          };
        },
      },
      {
        tag: "img[src]",
      },
    ];
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
          };
        },
      },
      align: {
        default: "center",
        parseHTML: (element) => {
          if (element.tagName?.toLowerCase() === "figure") {
            const align =
              element.getAttribute("data-align") ||
              (element as HTMLElement).style.textAlign;
            return align || "center";
          }
          const align =
            element.getAttribute("data-align") ||
            (element as HTMLElement).style.textAlign;
          return align || "center";
        },
        renderHTML: (attributes) => {
          if (!attributes.align || attributes.align === "center") {
            return {
              "data-align": "center",
              style: "display: block; margin-left: auto; margin-right: auto;",
            };
          }
          if (attributes.align === "left") {
            return {
              "data-align": "left",
              style: "display: block; margin-left: 0; margin-right: auto;",
            };
          }
          if (attributes.align === "right") {
            return {
              "data-align": "right",
              style: "display: block; margin-left: auto; margin-right: 0;",
            };
          }
          return {};
        },
      },
      source_url: {
        default: null,
        parseHTML: (element) => {
          if (element.tagName?.toLowerCase() === "figure") {
            return element.getAttribute("data-source-url");
          }
          return element.getAttribute("data-source-url");
        },
        renderHTML: (attributes) => {
          if (!attributes.source_url) return {};
          return { "data-source-url": attributes.source_url };
        },
      },
      source_name: {
        default: null,
        parseHTML: (element) => {
          if (element.tagName?.toLowerCase() === "figure") {
            return element.getAttribute("data-source-name");
          }
          return element.getAttribute("data-source-name");
        },
        renderHTML: (attributes) => {
          if (!attributes.source_name) return {};
          return { "data-source-name": attributes.source_name };
        },
      },
      license_note: {
        default: null,
        parseHTML: (element) => {
          if (element.tagName?.toLowerCase() === "figure") {
            return element.getAttribute("data-license-note");
          }
          return element.getAttribute("data-license-note");
        },
        renderHTML: (attributes) => {
          if (!attributes.license_note) return {};
          return { "data-license-note": attributes.license_note };
        },
      },
      year: {
        default: null,
        parseHTML: (element) => {
          if (element.tagName?.toLowerCase() === "figure") {
            return element.getAttribute("data-year");
          }
          return element.getAttribute("data-year");
        },
        renderHTML: (attributes) => {
          if (!attributes.year) return {};
          return { "data-year": attributes.year };
        },
      },
      show_attribution: {
        default: true,
        parseHTML: (element) => {
          const val = element.getAttribute("data-show-attribution");
          if (val === null) return true;
          return val === "true";
        },
        renderHTML: (attributes) => {
          if (attributes.show_attribution === undefined) return {};
          return {
            "data-show-attribution": attributes.show_attribution
              ? "true"
              : "false",
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const n: any = node;
    const align = n.attrs.align || "center";

    const figureAttrs: Record<string, any> = mergeAttributes(HTMLAttributes, {
      "data-type": "image",
      "data-align": align,
      style: `text-align: ${align};`,
    });
    if (n.attrs.source_url) figureAttrs["data-source-url"] = n.attrs.source_url;
    if (n.attrs.source_name)
      figureAttrs["data-source-name"] = n.attrs.source_name;
    if (n.attrs.license_note)
      figureAttrs["data-license-note"] = n.attrs.license_note;
    if (n.attrs.year) figureAttrs["data-year"] = n.attrs.year;
    figureAttrs["data-show-attribution"] =
      n.attrs.show_attribution ?? true ? "true" : "false";

    const imgAttrs = mergeAttributes(this.options.HTMLAttributes, {
      src: n.attrs.src,
      alt: n.attrs.alt,
      title: n.attrs.title,
      width: n.attrs.width,
      height: n.attrs.height,
    });

    // Wrap image in anchor tag if source_url exists (clickable in preview)
    const imgElement: any[] = ["img", imgAttrs];
    const children: any[] = n.attrs.source_url
      ? [
          [
            "a",
            {
              href: n.attrs.source_url,
              target: "_blank",
              rel: "noopener noreferrer",
              class: "image-source-link",
            },
            imgElement,
          ],
        ]
      : [imgElement];

    const shouldShowCaption =
      (n.attrs.show_attribution ?? true) && !!n.attrs.source_url;
    if (shouldShowCaption) {
      const sourceName =
        n.attrs.source_name ||
        (() => {
          try {
            return new URL(n.attrs.source_url).hostname.replace(/^www\./, "");
          } catch {
            return "Source";
          }
        })();
      const year = n.attrs.year ? ` (${n.attrs.year})` : "";
      const captionText = `Image: ${sourceName}${year}.`;

      const captionChildren: any[] = [
        "figcaption",
        { class: "image-caption" },
        ["span", {}, captionText + " "],
        [
          "a",
          {
            href: n.attrs.source_url,
            target: "_blank",
            rel: "noopener noreferrer",
          },
          "(link)",
        ],
      ];
      if (n.attrs.license_note) {
        captionChildren.push([
          "span",
          { class: "image-license" },
          ` — ${n.attrs.license_note}`,
        ]);
      }
      children.push(captionChildren);
    }

    return ["figure", figureAttrs, ...children];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align: "left" | "center" | "right") =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes(this.name, { align });
        },
      setImageSize:
        (width: string | number, height?: string | number) =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes(this.name, {
            width: typeof width === "number" ? `${width}px` : width,
            height: height
              ? typeof height === "number"
                ? `${height}px`
                : height
              : undefined,
          });
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "image-wrapper";

      const inner = document.createElement("div");
      inner.className = "image-inner group";

      const img = document.createElement("img");
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (key === "class") {
          img.className = value as string;
        } else if (value !== null && value !== undefined) {
          img.setAttribute(key, value as string);
        }
      });

      // Set width and height if provided
      if (node.attrs.width) {
        img.style.width =
          typeof node.attrs.width === "number"
            ? `${node.attrs.width}px`
            : node.attrs.width;
      }
      if (node.attrs.height) {
        img.style.height =
          typeof node.attrs.height === "number"
            ? `${node.attrs.height}px`
            : node.attrs.height;
      }

      // Apply alignment (aligns the inner container inside a full-width wrapper)
      const align = node.attrs.align || "center";
      dom.setAttribute("data-align", align);
      dom.style.textAlign =
        align === "left" ? "left" : align === "right" ? "right" : "center";

      // Make image selectable (NodeSelection) so BubbleMenu positions correctly
      const selectThisImage = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = getPos();
        if (typeof pos === "number") {
          // Create a transaction with NodeSelection
          const { state, view } = editor;
          const { tr } = state;
          const nodeSelection = NodeSelection.create(tr.doc, pos);
          tr.setSelection(nodeSelection);
          view.dispatch(tr);
          view.focus();
        }
      };
      img.addEventListener("click", selectThisImage);
      inner.addEventListener("click", selectThisImage);

      // Add resize handles
      const resizeHandle = document.createElement("div");
      resizeHandle.className = "resize-handle";
      resizeHandle.contentEditable = "false";

      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      let startHeight = 0;

      resizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startWidth = img.offsetWidth;
        startHeight = img.offsetHeight;

        const onMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;

          const deltaX = e.clientX - startX;

          // Maintain aspect ratio
          const aspectRatio = startWidth / startHeight;
          const newWidth = Math.max(100, startWidth + deltaX);
          const newHeight = newWidth / aspectRatio;

          img.style.width = `${newWidth}px`;
          img.style.height = `${newHeight}px`;

          // Update the node attributes
          const pos = getPos();
          if (typeof pos === "number") {
            editor.commands.command(({ tr }) => {
              const node = tr.doc.nodeAt(pos);
              if (node) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  width: `${newWidth}px`,
                  height: `${newHeight}px`,
                });
              }
              return true;
            });
          }
        };

        const onMouseUp = () => {
          isResizing = false;
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      inner.appendChild(img);
      inner.appendChild(resizeHandle);
      dom.appendChild(inner);

      // Attribution caption (editor-only UI)
      const caption = document.createElement("div");
      caption.className = "image-caption";
      caption.contentEditable = "false";

      const updateCaption = (n: any) => {
        const show = (n.attrs.show_attribution ?? true) && !!n.attrs.source_url;
        if (!show) {
          caption.style.display = "none";
          caption.textContent = "";
          return;
        }
        caption.style.display = "";
        const sourceName =
          n.attrs.source_name ||
          (() => {
            try {
              return new URL(n.attrs.source_url).hostname.replace(/^www\./, "");
            } catch {
              return "Source";
            }
          })();
        const year = n.attrs.year ? ` (${n.attrs.year})` : "";
        caption.innerHTML = "";
        const span = document.createElement("span");
        span.textContent = `Image: ${sourceName}${year}. `;
        const a = document.createElement("a");
        a.href = n.attrs.source_url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "(link)";
        caption.appendChild(span);
        caption.appendChild(a);
        if (n.attrs.license_note) {
          const lic = document.createElement("span");
          lic.className = "image-license";
          lic.textContent = ` — ${n.attrs.license_note}`;
          caption.appendChild(lic);
        }
      };

      updateCaption(node);
      dom.appendChild(caption);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }

          // Update image attributes
          if (updatedNode.attrs.width) {
            img.style.width =
              typeof updatedNode.attrs.width === "number"
                ? `${updatedNode.attrs.width}px`
                : updatedNode.attrs.width;
          } else {
            img.style.width = "";
          }

          if (updatedNode.attrs.height) {
            img.style.height =
              typeof updatedNode.attrs.height === "number"
                ? `${updatedNode.attrs.height}px`
                : updatedNode.attrs.height;
          } else {
            img.style.height = "";
          }

          // Update alignment (wrapper text-align)
          const align = updatedNode.attrs.align || "center";
          dom.setAttribute("data-align", align);
          dom.style.textAlign =
            align === "left" ? "left" : align === "right" ? "right" : "center";

          updateCaption(updatedNode);

          return true;
        },
      };
    };
  },
}).configure({
  inline: false,
  allowBase64: true,
  HTMLAttributes: {
    class: "max-w-full h-auto rounded-lg my-4 cursor-pointer",
  },
});
