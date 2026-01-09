/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, Transaction, EditorState } from "prosemirror-state";

export interface TemplateBylineOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    templateByline: {
      setTemplateByline: (attributes: {
        authorName: string;
        date: string;
      }) => ReturnType;
      updateTemplateByline: (attributes: {
        authorName?: string;
        date?: string;
      }) => ReturnType;
    };
  }
}

export const TemplateBylineExtension = Node.create<TemplateBylineOptions>({
  name: "templateByline",

  group: "block",

  content: "inline*",

  addAttributes() {
    return {
      authorName: {
        default: "Author Name",
        parseHTML: (element) =>
          element.getAttribute("data-author-name") || "Author Name",
        renderHTML: (attributes) => {
          if (!attributes.authorName) {
            return {};
          }
          return {
            "data-author-name": attributes.authorName,
          };
        },
      },
      date: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-date") || "",
        renderHTML: (attributes) => {
          if (!attributes.date) {
            return {};
          }
          return {
            "data-date": attributes.date,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'p[data-template-type="byline"]',
        getAttrs: (node) => {
          if (typeof node === "string") return false;
          const element = node as HTMLElement;
          // First try to get from data attributes (preferred)
          const authorName = element.getAttribute("data-author-name");
          const date = element.getAttribute("data-date");

          // If we have both from data attributes, use them
          if (authorName && date) {
            return {
              authorName,
              date,
            };
          }

          // Fallback to parsing from text content
          const text = element.textContent || "";
          const match = text.match(/^By\s+(.+?)\s*•\s*(.+)$/);
          if (match) {
            return {
              authorName: match[1].trim(),
              date: match[2].trim(),
            };
          }

          // If we have at least one from data attributes, use what we have
          if (authorName || date) {
            return {
              authorName: authorName || "Author Name",
              date:
                date ||
                new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
            };
          }

          // Default values if nothing found
          return {
            authorName: "Author Name",
            date: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { authorName, date } = node.attrs;
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        class:
          "byline text-xs font-bold tracking-wide uppercase mb-12 border-b pb-4 text-left",
        "data-template-type": "byline",
        "data-template-required": "true",
        "data-author-name": authorName || "Author Name",
        "data-date": date || "",
      }),
      `By ${authorName || "Author Name"} • ${
        date ||
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      }`,
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const { authorName, date } = node.attrs;

      const wrapper = document.createElement("p");
      wrapper.className =
        "byline text-xs font-bold tracking-wide uppercase mb-12 border-b pb-4 text-left";
      wrapper.setAttribute("data-template-type", "byline");
      wrapper.setAttribute("data-template-required", "true");
      wrapper.contentEditable = "false";

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

      // Author name input (combined with "By" text)
      const authorInput = document.createElement("input");
      authorInput.type = "text";
      authorInput.value = authorName ? `By ${authorName}` : "By Author Name";
      authorInput.className =
        "template-byline-author bg-transparent inline-block focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1";
      authorInput.style.width = "auto";
      authorInput.style.minWidth = "140px";
      authorInput.setAttribute("data-editable", "authorName");

      // Initial resize
      resizeInput(authorInput);

      // Fixed separator
      const separator = document.createTextNode(" • ");

      // Date input
      const dateInput = document.createElement("input");
      dateInput.type = "text";
      dateInput.value =
        date ||
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      dateInput.className =
        "template-byline-date bg-transparent inline-block focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1";
      dateInput.style.width = "auto";
      dateInput.style.minWidth = "100px";
      dateInput.setAttribute("data-editable", "date");

      // Initial resize
      resizeInput(dateInput);

      wrapper.appendChild(authorInput);
      wrapper.appendChild(separator);
      wrapper.appendChild(dateInput);

      // Handle updates
      const updateNode = () => {
        // Extract author name from "By Author Name" format
        const authorText = authorInput.value.trim() || "By Author Name";
        const authorMatch = authorText.match(/^By\s+(.+)$/i);
        const newAuthorName = authorMatch
          ? authorMatch[1].trim()
          : authorText.replace(/^By\s*/i, "").trim() || "Author Name";
        const newDate =
          dateInput.value.trim() ||
          new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

        if (typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            editor.commands.command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                authorName: newAuthorName,
                date: newDate,
              });
              return true;
            });
          }
        }
      };

      // Resize on input
      authorInput.addEventListener("input", () => {
        resizeInput(authorInput);
      });
      authorInput.addEventListener("blur", updateNode);
      authorInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          authorInput.blur();
        }
      });

      // Resize on input
      dateInput.addEventListener("input", () => {
        resizeInput(dateInput);
      });
      dateInput.addEventListener("blur", updateNode);
      dateInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          dateInput.blur();
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
            document.activeElement !== authorInput &&
            document.activeElement !== dateInput
          ) {
            const currentAuthorName =
              updatedNode.attrs.authorName || "Author Name";
            const expectedValue = `By ${currentAuthorName}`;
            if (authorInput.value !== expectedValue) {
              authorInput.value = expectedValue;
              resizeInput(authorInput);
            }
            if (updatedNode.attrs.date !== date) {
              dateInput.value =
                updatedNode.attrs.date ||
                new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              resizeInput(dateInput);
            }
          }
          return true; // Node view updated successfully
        },
      };
    };
  },

  addCommands() {
    return {
      setTemplateByline:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateTemplateByline:
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

          return true;
        },
      }),
    ];
  },
});
