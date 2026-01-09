/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, Transaction, EditorState } from "prosemirror-state";

export interface TemplateSeriesOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    templateSeries: {
      setTemplateSeries: (attributes: {
        seriesName: string;
        volume: string;
      }) => ReturnType;
      updateTemplateSeries: (attributes: {
        seriesName?: string;
        volume?: string;
      }) => ReturnType;
    };
  }
}

export const TemplateSeriesExtension = Node.create<TemplateSeriesOptions>({
  name: "templateSeries",

  group: "block",

  content: "inline*",

  addAttributes() {
    return {
      seriesName: {
        default: "The Editorial Review",
        parseHTML: (element) => element.getAttribute("data-series-name"),
        renderHTML: (attributes) => {
          if (!attributes.seriesName) {
            return {};
          }
          return {
            "data-series-name": attributes.seriesName,
          };
        },
      },
      volume: {
        default: "XXIII",
        parseHTML: (element) => element.getAttribute("data-volume"),
        renderHTML: (attributes) => {
          if (!attributes.volume) {
            return {};
          }
          return {
            "data-volume": attributes.volume,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'p[data-template-type="series"]',
        getAttrs: (node) => {
          if (typeof node === "string") return false;
          const element = node as HTMLElement;
          // First try to get from data attributes (preferred)
          const seriesName = element.getAttribute("data-series-name");
          const volume = element.getAttribute("data-volume");

          // If we have both from data attributes, use them
          if (seriesName && volume) {
            return {
              seriesName,
              volume,
            };
          }

          // Fallback to parsing from text content
          const text = element.textContent || "";
          const match = text.match(/^(.+?)\s*•\s*Volume\s+(.+)$/);
          if (match) {
            return {
              seriesName: match[1].trim(),
              volume: match[2].trim(),
            };
          }

          // If we have at least one from data attributes, use what we have
          if (seriesName || volume) {
            return {
              seriesName: seriesName || "The Editorial Review",
              volume: volume || "XXIII",
            };
          }

          // Default values if nothing found
          return {
            seriesName: "The Editorial Review",
            volume: "XXIII",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { seriesName, volume } = node.attrs;
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        class:
          "editorial-header text-xs tracking-widest text-gray-400 uppercase mb-4 text-left",
        "data-template-type": "series",
        "data-template-required": "true",
        "data-series-name": seriesName || "The Editorial Review",
        "data-volume": volume || "XXIII",
      }),
      `${seriesName || "The Editorial Review"} • Volume ${volume || "XXIII"}`,
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const { seriesName, volume } = node.attrs;

      const wrapper = document.createElement("p");
      wrapper.className =
        "editorial-header text-xs tracking-widest text-gray-400 uppercase mb-4 text-left";
      wrapper.setAttribute("data-template-type", "series");
      wrapper.setAttribute("data-template-required", "true");
      wrapper.contentEditable = "false";

      // Series name input
      const seriesInput = document.createElement("input");
      seriesInput.type = "text";
      seriesInput.value = seriesName || "The Editorial Review";
      seriesInput.className =
        "template-series-name bg-transparent inline-block focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1";
      seriesInput.style.width = "auto";
      seriesInput.style.minWidth = "140px";
      seriesInput.setAttribute("data-editable", "seriesName");

      // Function to resize input based on content
      const resizeInput = (input: HTMLInputElement) => {
        // Create a temporary span to measure text width
        const temp = document.createElement("span");
        temp.style.visibility = "hidden";
        temp.style.position = "absolute";
        temp.style.whiteSpace = "pre";
        temp.style.font = window.getComputedStyle(input).font;
        temp.textContent = input.value || input.placeholder || "M";
        document.body.appendChild(temp);
        const width = Math.max(temp.offsetWidth + 20, 140); // Add padding, min 140px
        input.style.width = `${width}px`;
        document.body.removeChild(temp);
      };

      // Initial resize
      resizeInput(seriesInput);

      // Fixed separator
      const separator = document.createTextNode(" • ");

      // Volume input (combined with "Volume" text)
      const volumeInput = document.createElement("input");
      volumeInput.type = "text";
      volumeInput.value = `Volume ${volume || "XXIII"}`;
      volumeInput.className =
        "template-series-volume bg-transparent inline-block focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1";
      volumeInput.style.width = "auto";
      volumeInput.style.minWidth = "120px";
      volumeInput.setAttribute("data-editable", "volume");

      // Initial resize
      resizeInput(volumeInput);

      wrapper.appendChild(seriesInput);
      wrapper.appendChild(separator);
      wrapper.appendChild(volumeInput);

      // Handle updates from inputs
      const updateNode = () => {
        const newSeriesName =
          seriesInput.value.trim() || "The Editorial Review";
        // Extract volume number from "Volume XXIII" format
        const volumeText = volumeInput.value.trim() || "Volume XXIII";
        const volumeMatch = volumeText.match(/^Volume\s+(.+)$/i);
        const newVolume = volumeMatch
          ? volumeMatch[1].trim()
          : volumeText.replace(/^Volume\s*/i, "").trim() || "XXIII";

        // Only update if values actually changed
        if (
          newSeriesName === node.attrs.seriesName &&
          newVolume === node.attrs.volume
        ) {
          return;
        }

        if (typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            editor.commands.command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                seriesName: newSeriesName,
                volume: newVolume,
              });
              return true;
            });
          }
        }
      };

      // Resize on input
      seriesInput.addEventListener("input", () => {
        resizeInput(seriesInput);
      });
      seriesInput.addEventListener("blur", updateNode);
      seriesInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          seriesInput.blur();
        }
      });

      // Resize on input
      volumeInput.addEventListener("input", () => {
        resizeInput(volumeInput);
      });
      volumeInput.addEventListener("blur", updateNode);
      volumeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          volumeInput.blur();
        }
      });

      return {
        dom: wrapper,
        stopEvent: (event: Event) => event.target instanceof HTMLInputElement,
        ignoreMutation: () => true,
        update: (updatedNode) => {
          // Update input values if node attributes changed externally
          // But don't update if inputs are focused (user is typing)
          if (
            document.activeElement !== seriesInput &&
            document.activeElement !== volumeInput
          ) {
            if (updatedNode.attrs.seriesName !== seriesInput.value) {
              seriesInput.value =
                updatedNode.attrs.seriesName || "The Editorial Review";
              resizeInput(seriesInput);
            }
            if (updatedNode.attrs.volume !== volume) {
              volumeInput.value = `Volume ${
                updatedNode.attrs.volume || "XXIII"
              }`;
              resizeInput(volumeInput);
            }
          }
          return true; // Node view updated successfully
        },
      };
    };
  },

  addCommands() {
    return {
      setTemplateSeries:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateTemplateSeries:
        (attributes) =>
        ({ chain }) => {
          return chain().updateAttributes(this.name, attributes).run();
        },
    };
  },

  // Remove keyboard shortcuts - rely on filterTransaction to prevent node deletion
  // This allows normal text editing within the contentEditable spans

  addProseMirrorPlugins() {
    const extensionName = this.name;
    return [
      new Plugin({
        key: new PluginKey(`${extensionName}-protect`),
        filterTransaction(
          transaction: Transaction,
          state: EditorState
        ): boolean {
          // Check if this node type exists before the transaction
          let hadNode = false;
          state.doc.descendants((node: any) => {
            if (node.type.name === extensionName) {
              hadNode = true;
              return false; // Stop searching
            }
          });

          // If the node didn't exist before, allow the transaction
          if (!hadNode) return true;

          // If document didn't change, allow it
          if (!transaction.docChanged) return true;

          // Check if the node still exists after the transaction
          let hasNode = false;
          transaction.doc.descendants((node: any) => {
            if (node.type.name === extensionName) {
              hasNode = true;
              return false; // Stop searching
            }
          });

          // Block if the node was removed
          if (!hasNode) {
            return false;
          }

          return true; // Allow transaction (including text edits and attribute updates)
        },
      }),
    ];
  },
});
