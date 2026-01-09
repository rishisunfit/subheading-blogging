import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ButtonComponent } from "./ButtonComponent";

export interface ButtonOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    button: {
      setButton: (options: {
        text: string;
        url: string;
        variant?:
          | "solid"
          | "bordered"
          | "light"
          | "flat"
          | "faded"
          | "shadow"
          | "ghost";
        color?:
          | "default"
          | "primary"
          | "secondary"
          | "success"
          | "warning"
          | "danger"
          | "custom";
        customColor?: string;
        size?: "sm" | "md" | "lg";
        radius?: "none" | "sm" | "md" | "lg" | "full";
        align?: "left" | "center" | "right";
      }) => ReturnType;
    };
  }
}

export const ButtonExtension = Node.create<ButtonOptions>({
  name: "button",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      text: {
        default: "Button",
      },
      url: {
        default: "",
      },
      variant: {
        default: "solid",
      },
      color: {
        default: "primary",
      },
      customColor: {
        default: null,
      },
      size: {
        default: "md",
      },
      radius: {
        default: "md",
      },
      align: {
        default: "center",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="button"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "button",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonComponent);
  },

  addCommands() {
    return {
      setButton:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
