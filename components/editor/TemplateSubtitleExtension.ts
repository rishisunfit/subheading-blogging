/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, Transaction, EditorState } from "prosemirror-state";

export interface TemplateSubtitleOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    templateSubtitle: {
      setTemplateSubtitle: (attributes: { subtitle: string }) => ReturnType;
      updateTemplateSubtitle: (attributes: { subtitle: string }) => ReturnType;
    };
  }
}

export const TemplateSubtitleExtension = Node.create<TemplateSubtitleOptions>({
  name: "templateSubtitle",

  group: "block",

  content: "text*",

  addAttributes() {
    return {
      subtitle: {
        default: "A subtitle for your article",
        parseHTML: (element) =>
          element.textContent?.trim() || "A subtitle for your article",
        renderHTML: () => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'p[data-template-type="subtitle"]',
        getAttrs: (node) => {
          if (typeof node === "string") return false;
          const element = node as HTMLElement;
          const subtitle =
            element.getAttribute("data-subtitle") ||
            element.textContent?.trim() ||
            "A subtitle for your article";
          return {
            subtitle,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { subtitle } = node.attrs;
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        class: "subtitle text-xl italic text-gray-500 mb-8",
        "data-template-type": "subtitle",
        "data-template-required": "true",
        "data-subtitle": subtitle || "A subtitle for your article",
      }),
      subtitle || "A subtitle for your article",
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const { subtitle } = node.attrs;

      const wrapper = document.createElement("p");
      wrapper.className = "subtitle text-xl italic text-gray-500 mb-8";
      wrapper.setAttribute("data-template-type", "subtitle");
      wrapper.setAttribute("data-template-required", "true");
      wrapper.contentEditable = "false";

      const subtitleInput = document.createElement("input");
      subtitleInput.type = "text";
      subtitleInput.value = subtitle || "A subtitle for your article";
      subtitleInput.className =
        "template-subtitle bg-transparent block w-full min-w-[200px] focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1";
      subtitleInput.setAttribute("data-editable", "subtitle");

      wrapper.appendChild(subtitleInput);

      // Handle updates
      const updateNode = () => {
        const newSubtitle =
          subtitleInput.value.trim() || "A subtitle for your article";

        if (typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            editor.commands.command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                subtitle: newSubtitle,
              });
              return true;
            });
          }
        }
      };

      subtitleInput.addEventListener("blur", updateNode);
      subtitleInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          subtitleInput.blur();
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
      setTemplateSubtitle:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateTemplateSubtitle:
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
