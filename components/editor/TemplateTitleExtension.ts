/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, Transaction, EditorState } from "prosemirror-state";

export interface TemplateTitleOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    templateTitle: {
      setTemplateTitle: (attributes: { title: string }) => ReturnType;
      updateTemplateTitle: (attributes: { title: string }) => ReturnType;
    };
  }
}

export const TemplateTitleExtension = Node.create<TemplateTitleOptions>({
  name: "templateTitle",

  group: "block",

  content: "text*",

  addAttributes() {
    return {
      title: {
        default: "Untitled Article",
        parseHTML: (element) =>
          element.textContent?.trim() || "Untitled Article",
        renderHTML: () => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'h1[data-template-type="title"]',
        getAttrs: (node) => {
          if (typeof node === "string") return false;
          const element = node as HTMLElement;
          const title =
            element.getAttribute("data-title") ||
            element.textContent?.trim() ||
            "Untitled Article";
          return {
            title,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { title } = node.attrs;
    return [
      "h1",
      mergeAttributes(HTMLAttributes, {
        "data-template-type": "title",
        "data-template-required": "true",
        "data-title": title || "Untitled Article",
      }),
      title || "Untitled Article",
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const { title } = node.attrs;

      const wrapper = document.createElement("h1");
      wrapper.setAttribute("data-template-type", "title");
      wrapper.setAttribute("data-template-required", "true");
      wrapper.contentEditable = "false";

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.value = title || "Untitled Article";
      titleInput.className =
        "template-title bg-transparent block w-full min-w-[200px] focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1";
      titleInput.setAttribute("data-editable", "title");

      wrapper.appendChild(titleInput);

      // Handle updates
      const updateNode = () => {
        const newTitle = titleInput.value.trim() || "Untitled Article";

        if (typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            editor.commands.command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                title: newTitle,
              });
              return true;
            });
          }
        }
      };

      titleInput.addEventListener("blur", updateNode);
      titleInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          titleInput.blur();
        }
      });

      return {
        dom: wrapper,
        stopEvent: (event: Event) => event.target instanceof HTMLInputElement,
        ignoreMutation: () => true,
      };
    };
  },

  addCommands() {
    return {
      setTemplateTitle:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateTemplateTitle:
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
