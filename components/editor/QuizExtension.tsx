/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { NodeSelection } from "prosemirror-state";
import React from "react";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { quizzesApi } from "@/services/quizzes";
import type { Quiz } from "@/types/quiz";

export interface QuizOptions {
  HTMLAttributes: Record<string, any>;
  inline: boolean;
}

function QuizNodeView({ node, editor, getPos }: NodeViewProps) {
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadQuiz = async () => {
      if (!node?.attrs?.quizId) {
        setError("No quiz ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try to get by ID first (for user's own quizzes)
        let quizData = await quizzesApi.getById(node.attrs.quizId);

        // If not found, try by slug (for published quizzes)
        if (!quizData) {
          quizData = await quizzesApi.getBySlug(node.attrs.quizId);
        }

        if (quizData) {
          setQuiz(quizData);
        } else {
          setError("Quiz not found");
        }
      } catch (err) {
        console.error("Error loading quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [node?.attrs?.quizId]);

  const align = node.attrs.align || "center";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof getPos === "function") {
      const pos = getPos();
      if (typeof pos === "number") {
        editor.view.dispatch(
          editor.view.state.tr.setSelection(
            NodeSelection.create(editor.view.state.doc, pos)
          )
        );
      }
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      className="quiz-wrapper my-8"
      data-type="quiz"
      data-quiz-id={node.attrs.quizId}
      data-align={align}
      style={{ textAlign: align as any }}
      onClick={handleClick}
    >
      <div className="quiz-inner inline-block max-w-2xl w-full">
        {loading ? (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : error || !quiz ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 text-sm">{error || "Quiz not found"}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <QuizPlayer quiz={quiz} />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    quiz: {
      /**
       * Insert a quiz
       */
      setQuiz: (options: {
        quizId: string;
        align?: "left" | "center" | "right";
      }) => ReturnType;
      /**
       * Set quiz alignment
       */
      setQuizAlign: (align: "left" | "center" | "right") => ReturnType;
    };
  }
}

export const QuizExtension = Node.create<QuizOptions>({
  name: "quiz",

  addOptions() {
    return {
      HTMLAttributes: {},
      inline: false,
    };
  },

  inline: false,

  group: "block",

  addAttributes() {
    return {
      quizId: {
        default: null,
        parseHTML: (element: any) => {
          const quizId = element.getAttribute("data-quiz-id");
          return quizId || null;
        },
        renderHTML: (attributes: any) => {
          if (!attributes.quizId) {
            return {};
          }
          return {
            "data-quiz-id": attributes.quizId,
          };
        },
      },
      align: {
        default: "center",
        parseHTML: (element: any) => {
          const align =
            element.getAttribute("data-align") ||
            (element as HTMLElement).style.textAlign;
          return align || "center";
        },
        renderHTML: (attributes: any) => {
          if (!attributes.align) {
            return {};
          }
          return {
            "data-align": attributes.align,
            style: `text-align: ${attributes.align};`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="quiz"]',
        getAttrs: (element: any) => {
          if (!(element instanceof HTMLElement)) return false;
          return {
            quizId: element.getAttribute("data-quiz-id"),
            align: element.getAttribute("data-align") || "center",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }: any) {
    const align = node.attrs.align || "center";
    return [
      "div",
      {
        ...HTMLAttributes,
        "data-type": "quiz",
        "data-quiz-id": node.attrs.quizId,
        "data-align": align,
        style: `text-align: ${align};`,
        class: "quiz-wrapper",
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuizNodeView);
  },

  addCommands() {
    return {
      setQuiz:
        (options: { quizId: string; align?: "left" | "center" | "right" }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              quizId: options.quizId,
              align: options.align || "center",
            },
          });
        },
      setQuizAlign:
        (align: "left" | "center" | "right") =>
        ({ chain, state }: any) => {
          const { selection } = state;
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === this.name
          ) {
            return chain().updateAttributes(this.name, { align }).run();
          }
          return false;
        },
    };
  },
});
