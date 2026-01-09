import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { Link, ExternalLink, X } from "lucide-react";
import { useState, useEffect } from "react";

interface LinkBubbleMenuProps {
  editor: Editor;
}

export function LinkBubbleMenu({ editor }: LinkBubbleMenuProps) {
  const [url, setUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateUrl = () => {
      if (editor.isActive("link")) {
        const linkUrl = editor.getAttributes("link").href;
        setUrl(linkUrl || "");
      } else {
        setUrl("");
        setIsEditing(false);
      }
    };

    updateUrl();

    const handleUpdate = () => {
      updateUrl();
    };

    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor]);

  if (!editor) return null;

  const handleSetLink = () => {
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setIsEditing(false);
  };

  const handleRemoveLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setIsEditing(false);
    setUrl("");
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed }: { editor: Editor }) => {
        // Only show when link is active AND has a valid href
        if (!ed.isActive("link")) {
          return false;
        }

        const linkAttrs = ed.getAttributes("link");
        const href = linkAttrs?.href;

        // Only show if there's actually a non-empty URL string
        if (!href || typeof href !== "string" || href.trim().length === 0) {
          return false;
        }

        // Double-check by looking at the actual marks in the selection
        const { from, to } = ed.state.selection;
        if (from === to) {
          return false; // No selection
        }

        let foundLink = false;
        ed.state.doc.nodesBetween(from, to, (node) => {
          if (node.marks) {
            const linkMark = node.marks.find(
              (mark) => mark.type.name === "link"
            );
            if (
              linkMark &&
              linkMark.attrs.href &&
              linkMark.attrs.href.trim().length > 0
            ) {
              foundLink = true;
              return false; // Stop searching
            }
          }
        });

        return foundLink;
      }}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-2">
        {isEditing ? (
          <>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSetLink();
                } else if (e.key === "Escape") {
                  setIsEditing(false);
                }
              }}
              placeholder="Enter URL"
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              autoFocus
            />
            <button
              onClick={handleSetLink}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : url && url.trim().length > 0 ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 underline text-sm max-w-[250px] truncate"
              onClick={(e) => {
                e.stopPropagation();
                window.open(url, "_blank");
              }}
            >
              <ExternalLink size={14} />
              <span className="truncate">{url}</span>
            </a>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Edit link"
            >
              <Link size={16} />
            </button>
            <button
              onClick={handleRemoveLink}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove link"
            >
              <X size={16} />
            </button>
          </>
        ) : null}
      </div>
    </BubbleMenu>
  );
}
