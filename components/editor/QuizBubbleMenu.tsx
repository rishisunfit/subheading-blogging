import { useState, useEffect } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "prosemirror-state";
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";

interface QuizBubbleMenuProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
}

export function QuizBubbleMenu({ editor }: QuizBubbleMenuProps) {
  const [isQuizSelected, setIsQuizSelected] = useState(false);

  useEffect(() => {
    const updateSelection = () => {
      const { selection } = editor.state;
      const isSelected =
        selection instanceof NodeSelection &&
        selection.node.type.name === "quiz";
      setIsQuizSelected(isSelected);
    };

    editor.on("selectionUpdate", updateSelection);
    editor.on("transaction", updateSelection);
    updateSelection();

    return () => {
      editor.off("selectionUpdate", updateSelection);
      editor.off("transaction", updateSelection);
    };
  }, [editor]);

  const handleAlign = (align: "left" | "center" | "right") => {
    editor.chain().focus().setQuizAlign(align).run();
  };

  const handleDelete = () => {
    editor.chain().focus().deleteSelection().run();
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state }) => {
        const { selection } = state;
        return (
          selection instanceof NodeSelection &&
          selection.node.type.name === "quiz"
        );
      }}
      updateDelay={0}
      key={isQuizSelected ? "quiz-selected" : "quiz-not-selected"}
    >
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
        <button
          onClick={() => handleAlign("left")}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Align Left"
        >
          <AlignLeft size={16} className="text-gray-700" />
        </button>
        <button
          onClick={() => handleAlign("center")}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Align Center"
        >
          <AlignCenter size={16} className="text-gray-700" />
        </button>
        <button
          onClick={() => handleAlign("right")}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Align Right"
        >
          <AlignRight size={16} className="text-gray-700" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-50 rounded transition-colors"
          title="Delete Quiz"
        >
          <Trash2 size={16} className="text-red-600" />
        </button>
      </div>
    </BubbleMenu>
  );
}
