/* eslint-disable @typescript-eslint/no-explicit-any */
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NodeSelection } from "prosemirror-state";
import { useState, useEffect } from "react";

interface ImageBubbleMenuProps {
  editor: Editor;
}

export function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const [isImageSelected, setIsImageSelected] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { selection } = editor.state;
      const selected =
        selection instanceof NodeSelection &&
        selection.node.type.name === "image";
      setIsImageSelected(selected);
    };

    // Initial check
    updateSelection();

    // Listen to selection changes
    editor.on("selectionUpdate", updateSelection);
    editor.on("transaction", updateSelection);

    return () => {
      editor.off("selectionUpdate", updateSelection);
      editor.off("transaction", updateSelection);
    };
  }, [editor]);

  if (!editor) return null;

  const handleAlign = (align: "left" | "center" | "right") => {
    const { state } = editor;
    const { selection } = state;

    const imagePos =
      selection instanceof NodeSelection && selection.node.type.name === "image"
        ? selection.from
        : null;

    if (imagePos === null) return;

    editor.commands.command(({ tr }) => {
      const node = tr.doc.nodeAt(imagePos);
      if (!node || node.type.name !== "image") return false;
      tr.setNodeMarkup(imagePos, undefined, { ...node.attrs, align });
      tr.setSelection(NodeSelection.create(tr.doc, imagePos));
      return true;
    });
    editor.commands.focus();
  };

  const handleDelete = async () => {
    const { state } = editor;
    const { selection } = state;

    if (
      !(selection instanceof NodeSelection) ||
      selection.node.type.name !== "image"
    ) {
      return;
    }

    const imageNode: any = selection.node;
    const imagePos = selection.from;

    const imageSrc = imageNode.attrs.src;

    // Delete from Supabase storage if it's a Supabase URL
    if (imageSrc && imageSrc.includes("supabase.co/storage")) {
      try {
        // Extract the file path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/images/path/to/file.png
        // or: https://xxx.supabase.co/storage/v1/object/sign/images/path/to/file.png?token=...
        const url = new URL(imageSrc);
        const pathMatch = url.pathname.match(
          /\/storage\/v1\/object\/(?:public|sign)\/images\/(.+)/
        );

        if (pathMatch && pathMatch[1]) {
          const filePath = decodeURIComponent(pathMatch[1]);

          // Remove the image from Supabase storage
          const { error } = await supabase.storage
            .from("images")
            .remove([filePath]);

          if (error) {
            console.error("Error deleting image from storage:", error);
            // Continue with deleting from editor even if storage delete fails
          }
        }
      } catch (error) {
        console.error("Error parsing image URL for deletion:", error);
        // Continue with deleting from editor
      }
    }

    // Delete the image node from the editor
    editor.commands.command(({ tr }) => {
      tr.setSelection(NodeSelection.create(tr.doc, imagePos));
      tr.deleteSelection();
      return true;
    });
    editor.commands.focus();
  };

  // Force re-render when selection changes
  const shouldShow = ({ editor: ed }: { editor: Editor }) => {
    const { selection } = ed.state;
    const isImage =
      selection instanceof NodeSelection &&
      selection.node.type.name === "image";
    return isImage;
  };

  return (
    <BubbleMenu
      key={isImageSelected ? "image-selected" : "image-not-selected"}
      editor={editor}
      updateDelay={0}
      shouldShow={shouldShow}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-2">
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          <button
            onClick={() => handleAlign("left")}
            className={`p-2 rounded transition-colors ${
              editor.getAttributes("image").align === "left"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            title="Align left"
          >
            <AlignLeft size={18} />
          </button>
          <button
            onClick={() => handleAlign("center")}
            className={`p-2 rounded transition-colors ${
              !editor.getAttributes("image").align ||
              editor.getAttributes("image").align === "center"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            title="Align center"
          >
            <AlignCenter size={18} />
          </button>
          <button
            onClick={() => handleAlign("right")}
            className={`p-2 rounded transition-colors ${
              editor.getAttributes("image").align === "right"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            title="Align right"
          >
            <AlignRight size={18} />
          </button>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          title="Delete image"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </BubbleMenu>
  );
}
