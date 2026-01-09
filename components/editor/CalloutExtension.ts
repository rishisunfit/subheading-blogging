import { Node } from "@tiptap/core";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: {
        backgroundColor?: string;
        borderColor?: string;
      }) => ReturnType;
      toggleCallout: (attributes?: {
        backgroundColor?: string;
        borderColor?: string;
      }) => ReturnType;
      unsetCallout: () => ReturnType;
      updateCalloutColor: (
        backgroundColor: string,
        borderColor?: string
      ) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create<CalloutOptions>({
  name: "callout",

  group: "block",

  content: "block+",

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      backgroundColor: {
        default: "#FEF9C3", // Yellow-100
        parseHTML: (element) =>
          element.getAttribute("data-background-color") ||
          element.style.backgroundColor ||
          "#FEF9C3",
      },
      borderColor: {
        default: "#CA8A04", // Yellow-600
        parseHTML: (element) =>
          element.getAttribute("data-border-color") || "#CA8A04",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ node }) {
    const backgroundColor = node.attrs.backgroundColor || "#FEF9C3";
    const borderColor = node.attrs.borderColor || "#CA8A04";

    return [
      "div",
      {
        "data-type": "callout",
        "data-background-color": backgroundColor,
        "data-border-color": borderColor,
        class: "callout-block",
        style: `background-color: ${backgroundColor}; border-left: 4px solid ${borderColor}; padding: 1rem 1.5rem; margin: 1rem 0; border-radius: 0.5rem;`,
      },
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ chain, state }) => {
          const { selection } = state;
          const { empty } = selection;

          // If selection is empty, insert a new callout with placeholder text
          if (empty) {
            return chain()
              .insertContent({
                type: this.name,
                attrs: attributes,
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Type your callout text here...",
                      },
                    ],
                  },
                ],
              })
              .run();
          }

          // If text is selected, wrap it in a callout
          return chain().wrapIn(this.name, attributes).run();
        },
      toggleCallout:
        (attributes) =>
        ({ commands, state }) => {
          const { selection } = state;
          const { $from } = selection;

          // Check if we're already in a callout
          const calloutNode = $from.node($from.depth);
          if (calloutNode?.type.name === "callout") {
            return commands.lift(this.name);
          }

          return commands.wrapIn(this.name, attributes);
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
      updateCalloutColor:
        (backgroundColor, borderColor) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, {
            backgroundColor,
            borderColor: borderColor || backgroundColor,
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () => this.editor.commands.toggleCallout(),
    };
  },
});

// Preset callout colors
export const calloutPresets = [
  { name: "Yellow", bg: "#FEF9C3", border: "#CA8A04" },
  { name: "Blue", bg: "#DBEAFE", border: "#2563EB" },
  { name: "Green", bg: "#DCFCE7", border: "#16A34A" },
  { name: "Red", bg: "#FEE2E2", border: "#DC2626" },
  { name: "Purple", bg: "#F3E8FF", border: "#9333EA" },
  { name: "Gray", bg: "#F3F4F6", border: "#6B7280" },
  { name: "Orange", bg: "#FFEDD5", border: "#EA580C" },
  { name: "Teal", bg: "#CCFBF1", border: "#0D9488" },
];
