import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Code2,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Palette,
  Minus,
  AlignVerticalJustifyCenter,
  Undo,
  Redo,
  Table,
  Subscript,
  Superscript,
  Type,
  Clock,
  Video,
  Eraser,
} from "lucide-react";
import { Editor } from "@tiptap/react";
import { useState, useRef, useEffect } from "react";
import { useDialog } from "@/hooks/useDialog";
import { ImagePickerModal } from "./ImagePickerModal";
import { AIImageGeneratorModal } from "./AIImageGeneratorModal";
import { ImageHistoryModal } from "./ImageHistoryModal";
import { TableModal } from "./TableModal";
import { VideoModal } from "./VideoModal";
import { QuizModal } from "./QuizModal";
import { ColorPickerPopover } from "./ColorPickerPopover";
import {
  ImageAttributionModal,
  type ImageAttributionValues,
} from "./ImageAttributionModal";
import { uploadImageToStorage, uploadDataURLToStorage } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { mediaApi } from "@/services/media";
import { ButtonModal, type ButtonConfig } from "./ButtonModal";

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}

const ToolbarButton = ({
  onClick,
  active,
  children,
  title,
  disabled = false,
}: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${active ? "bg-gray-100 text-gray-900" : "text-gray-700"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    title={title}
    type="button"
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-6 bg-gray-300 mx-0.5" />;

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [currentAlignment, setCurrentAlignment] = useState<string | null>(null);
  const [showLineSpacingPicker, setShowLineSpacingPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [customColor, setCustomColor] = useState("#3B82F6");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWebImageModal, setShowWebImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [, forceUpdate] = useState({});
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const { showDialog } = useDialog();
  const { user } = useAuth();

  // Font sizes like Google Docs
  const fontSizes = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];

  // Listen to editor updates to refresh undo/redo button states
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      forceUpdate({});
      // Update alignment state
      if (editor.isActive({ textAlign: "center" }))
        setCurrentAlignment("center");
      else if (editor.isActive({ textAlign: "right" }))
        setCurrentAlignment("right");
      else if (editor.isActive({ textAlign: "justify" }))
        setCurrentAlignment("justify");
      else if (editor.isActive({ textAlign: "left" }))
        setCurrentAlignment("left");
      else setCurrentAlignment(null);
    };

    // Initial check
    handleUpdate();

    editor.on("transaction", handleUpdate);
    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("transaction", handleUpdate);
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor]);

  if (!editor) return null;

  const addLink = async () => {
    const previousUrl = editor.getAttributes("link").href;

    // If there's already a link, extend to it
    if (previousUrl) {
      editor.chain().focus().extendMarkRange("link").run();
      return;
    }

    // If text is selected, show inline editor (handled by BubbleMenu)
    // Otherwise, prompt for URL
    const url = await showDialog({
      type: "prompt",
      message: "Enter URL:",
      defaultValue: "",
      title: "Add Link",
    });

    if (url === null || url === false) {
      return;
    }

    if (typeof url === "string" && url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (typeof url === "string") {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!user) {
      await showDialog({
        type: "alert",
        title: "Error",
        message: "You must be logged in to upload images",
      });
      return;
    }

    try {
      // Upload to Supabase storage
      const imageUrl = await uploadImageToStorage(file, user.id);
      console.log("Image uploaded, URL:", imageUrl);

      // Test if image URL is accessible
      const img = document.createElement("img");
      img.onload = () => {
        console.log("Image is accessible and loaded successfully");
      };
      img.onerror = () => {
        console.error("Image failed to load from URL:", imageUrl);
      };
      img.src = imageUrl;

      // Insert image into editor (alignment defaults to center via ImageExtension attrs)
      editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();

      // Save to media table
      try {
        await mediaApi.create({
          type: "image",
          url: imageUrl,
          source: "upload",
          metadata: {
            filename: file.name,
          },
        });
      } catch (err) {
        console.error("Error saving image to media table:", err);
        // Don't throw - image upload succeeded, media save is optional
      }

      // Wait a bit and verify the image was inserted
      setTimeout(() => {
        const html = editor.getHTML();
        console.log("Editor HTML after image insert:", html);
        // Check if image tag exists in HTML
        if (html.includes(imageUrl)) {
          console.log("✓ Image URL found in editor HTML");
        } else {
          console.error("✗ Image URL NOT found in editor HTML");
        }
      }, 100);
    } catch (error) {
      console.error("Error uploading image:", error);
      await showDialog({
        type: "alert",
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to upload image",
      });
    }
  };

  const handleUseGeneratedImage = async (imageUrl: string) => {
    if (!user) {
      await showDialog({
        type: "alert",
        title: "Error",
        message: "You must be logged in to use images",
      });
      return;
    }

    try {
      // Upload the generated image to Supabase storage
      const uploadedUrl = await uploadDataURLToStorage(
        imageUrl,
        user.id,
        "generated-image.png"
      );
      console.log("Generated image uploaded, URL:", uploadedUrl);
      // Insert image into editor (alignment defaults to center via ImageExtension attrs)
      editor
        .chain()
        .focus()
        .setImage({ src: uploadedUrl, alt: "Generated image" })
        .run();

      // Note: AIImageGeneratorModal already saves to media table with full metadata (prompt, etc.)
      // So we don't need to save it again here to avoid duplicates

      // Verify the image was inserted
      const html = editor.getHTML();
      console.log("Editor HTML after image insert:", html);
    } catch (error) {
      console.error("Error uploading generated image:", error);
      await showDialog({
        type: "alert",
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to upload image",
      });
    }
  };

  const handleSelectFromHistory = async (imageUrl: string) => {
    // Use the image directly (it's already in Supabase storage)
    console.log("Using image from history, URL:", imageUrl);
    editor
      .chain()
      .focus()
      .setImage({ src: imageUrl, alt: "Image from history" })
      .run();
    // Verify the image was inserted
    const html = editor.getHTML();
    console.log("Editor HTML after image insert:", html);
  };

  const addImage = () => {
    setShowImagePicker(true);
  };

  const addVideo = () => {
    setShowVideoModal(true);
  };

  const handleInsertVideo = (
    url: string,
    align: "left" | "center" | "right" = "center"
  ) => {
    // Videos will be sized responsively at 70% via CSS
    editor
      .chain()
      .focus()
      .setVideo({
        src: url,
        align: align || "center",
      })
      .run();
  };

  const addQuiz = () => {
    setShowQuizModal(true);
  };

  const handleInsertQuiz = (
    quizId: string,
    align: "left" | "center" | "right" = "center"
  ) => {
    editor
      .chain()
      .focus()
      .setQuiz({
        quizId: quizId,
        align: align || "center",
      })
      .run();
  };

  const addButton = () => {
    setShowButtonModal(true);
  };

  const handleInsertButton = (buttonConfig: ButtonConfig) => {
    editor.chain().focus().setButton(buttonConfig).run();
  };

  const handleInsertWebImage = async (values: ImageAttributionValues) => {
    // Insert as an image node with attribution attrs
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src: values.imageUrl,
          alt: values.alt || null,
          source_url: values.sourceUrl,
          source_name: values.sourceName || null,
          license_note: values.licenseNote || null,
          year: values.year || null,
          show_attribution: values.showAttribution,
          // Keep alignment defaulting to center (ImageExtension default)
          align: "center",
        },
      })
      .run();

    // Save to media table
    if (user) {
      try {
        await mediaApi.create({
          type: "image",
          url: values.imageUrl,
          source: "web",
          metadata: {
            source_url: values.sourceUrl,
            source_name: values.sourceName || undefined,
            year: values.year || undefined,
            license_note: values.licenseNote || undefined,
          },
        });
      } catch (err) {
        console.error("Error saving web image to media table:", err);
        // Don't throw - image insertion succeeded, media save is optional
      }
    }
  };

  const setColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setShowColorPicker(false);
  };

  const setHighlight = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
    setShowHighlightPicker(false);
  };

  const setLineSpacing = (spacing: number) => {
    // Use TipTap's command API to apply line-height
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const { from, to } = state.selection;
        let hasChanges = false;

        // Get all nodes in the selection
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (
            node.type.name === "paragraph" ||
            node.type.name === "heading" ||
            node.type.name === "listItem"
          ) {
            const currentStyle = node.attrs.style || "";
            // Remove existing line-height if present
            const cleanedStyle = currentStyle
              .replace(/line-height:\s*[^;]+;?/gi, "")
              .replace(/;\s*;/g, ";") // Remove double semicolons
              .trim()
              .replace(/^;|;$/g, ""); // Remove leading/trailing semicolons

            const newStyle = cleanedStyle
              ? `${cleanedStyle}; line-height: ${spacing};`
              : `line-height: ${spacing};`;

            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              style: newStyle,
            });
            hasChanges = true;
          }
        });

        // If no selection or no changes, apply to current block
        if (!hasChanges || from === to) {
          const { $from } = state.selection;
          let node = $from.node($from.depth);
          let pos = $from.before($from.depth);

          // If we're not in a paragraph/heading/listItem, find the parent
          if (
            node.type.name !== "paragraph" &&
            node.type.name !== "heading" &&
            node.type.name !== "listItem"
          ) {
            for (let i = $from.depth; i > 0; i--) {
              const parentNode = $from.node(i);
              if (
                parentNode.type.name === "paragraph" ||
                parentNode.type.name === "heading" ||
                parentNode.type.name === "listItem"
              ) {
                node = parentNode;
                pos = $from.before(i);
                break;
              }
            }
          }

          if (
            node.type.name === "paragraph" ||
            node.type.name === "heading" ||
            node.type.name === "listItem"
          ) {
            const currentStyle = node.attrs.style || "";
            const cleanedStyle = currentStyle
              .replace(/line-height:\s*[^;]+;?/gi, "")
              .replace(/;\s*;/g, ";")
              .trim()
              .replace(/^;|;$/g, "");

            const newStyle = cleanedStyle
              ? `${cleanedStyle}; line-height: ${spacing};`
              : `line-height: ${spacing};`;

            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              style: newStyle,
            });
            hasChanges = true;
          }
        }

        return hasChanges;
      })
      .run();

    setShowLineSpacingPicker(false);
  };

  // Primary and secondary colors
  const textColors = [
    { name: "Black", value: "#000000" },
    { name: "Red", value: "#EF4444" },
    { name: "Orange", value: "#F97316" },
    { name: "Yellow", value: "#EAB308" },
    { name: "Green", value: "#22C55E" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Purple", value: "#A855F7" },
    { name: "Pink", value: "#EC4899" },
    { name: "Gray", value: "#6B7280" },
  ];

  const highlightColors = [
    { name: "Yellow", value: "#FEF08A" },
    { name: "Green", value: "#D1FAE5" },
    { name: "Blue", value: "#DBEAFE" },
    { name: "Pink", value: "#FCE7F3" },
    { name: "Orange", value: "#FED7AA" },
    { name: "Purple", value: "#E9D5FF" },
  ];

  return (
    <div className="border-b border-gray-200 bg-white flex-shrink-0">
      <div className="px-4">
        <div className="flex items-center justify-start gap-0 pt-1.5 pb-1.5 flex-wrap">
          {/* Headings */}
          <div className="flex items-center gap-0">
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Font Size Dropdown */}
          <div className="flex items-center gap-0 relative">
            <div className="relative">
              <button
                onClick={() => {
                  setShowFontSizePicker(!showFontSizePicker);
                  setShowColorPicker(false);
                  setShowHighlightPicker(false);
                  setShowLineSpacingPicker(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm font-medium ${showFontSizePicker ? "bg-gray-100 text-gray-900" : "text-gray-700"
                  }`}
                title="Font Size - Click to change text size"
              >
                <Type size={16} />
                <span className="text-xs">Size</span>
              </button>
              {showFontSizePicker && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] w-48"
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2">
                    <div className="text-xs text-gray-500 font-medium mb-2 px-2">Text Size</div>
                    {/* Clear Font Size - Standardize to default */}
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.chain().focus().unsetFontSize().run();
                        setShowFontSizePicker(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-blue-600 font-medium rounded-md mb-1 transition-colors flex items-center gap-2"
                    >
                      <Eraser size={14} />
                      Reset to Default
                    </button>
                    <div className="border-t border-gray-200 my-2" />
                    <div className="grid grid-cols-4 gap-1">
                      {fontSizes.map((size) => (
                        <button
                          key={size}
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            editor.chain().focus().setFontSize(`${size}px`).run();
                            setShowFontSizePicker(false);
                          }}
                          className="px-2 py-1.5 text-sm hover:bg-gray-100 rounded transition-colors text-center font-medium"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Clear All Formatting - useful for pasted content from Google Docs */}
            <ToolbarButton
              onClick={() => {
                editor.chain().focus().unsetAllMarks().run();
                editor.chain().focus().clearNodes().run();
              }}
              title="Clear All Formatting (removes all styles from selected text)"
            >
              <Eraser size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Text Formatting */}
          <div className="flex items-center gap-0 ">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold (Ctrl+B)"
            >
              <Bold size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic (Ctrl+I)"
            >
              <Italic size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Underline (Ctrl+U)"
            >
              <Underline size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Lists */}
          <div className="flex items-center gap-0 ">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Bullet List"
            >
              <List size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Numbered List"
            >
              <ListOrdered size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              active={editor.isActive("taskList")}
              title="Task List"
            >
              <CheckSquare size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Alignment */}
          <div
            className={`flex items-center gap-0 ${currentAlignment ? "bg-blue-50 rounded px-1 py-0.5" : ""
              }`}
          >
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={currentAlignment === "left"}
              title="Align Left"
            >
              <AlignLeft size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              active={currentAlignment === "center"}
              title="Align Center"
            >
              <AlignCenter size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={currentAlignment === "right"}
              title="Align Right"
            >
              <AlignRight size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              active={currentAlignment === "justify"}
              title="Justify"
            >
              <AlignJustify size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Code & Quote */}
          <div className="flex items-center gap-0 ">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive("code")}
              title="Inline Code"
            >
              <Code size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive("codeBlock")}
              title="Code Block"
            >
              <Code2 size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              title="Blockquote"
            >
              <Quote size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Line Spacing */}
          <div className="flex items-center gap-0  relative">
            <div className="relative">
              <ToolbarButton
                onClick={() => {
                  setShowLineSpacingPicker(!showLineSpacingPicker);
                  setShowColorPicker(false);
                  setShowHighlightPicker(false);
                }}
                active={showLineSpacingPicker}
                title="Line Spacing"
              >
                <AlignVerticalJustifyCenter size={18} />
              </ToolbarButton>
              {showLineSpacingPicker && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[120px]"
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    {[
                      { label: "Tight", value: 1.2 },
                      { label: "Normal", value: 1.5 },
                      { label: "Relaxed", value: 1.75 },
                      { label: "Loose", value: 2.0 },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLineSpacing(option.value);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Divider />

          {/* Color & Highlight */}
          <div className="flex items-center gap-0  relative">
            <div className="relative">
              <ToolbarButton
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false);
                }}
                active={showColorPicker}
                title="Text Color"
              >
                <div className="relative">
                  <Palette size={18} />
                  {editor.isActive("textStyle") &&
                    editor.getAttributes("textStyle").color && (
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            editor.getAttributes("textStyle").color,
                        }}
                      />
                    )}
                </div>
              </ToolbarButton>
              {showColorPicker && (
                <div className="fixed inset-0 z-[9999]" onClick={() => setShowColorPicker(false)}>
                  <div
                    className="absolute"
                    style={{ top: "100px", left: "50%", transform: "translateX(-50%)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ColorPickerPopover
                      initialColor={customColor}
                      onColorChange={(color) => {
                        setCustomColor(color);
                        setColor(color);
                      }}
                      onClose={() => setShowColorPicker(false)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <ToolbarButton
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false);
                }}
                active={showHighlightPicker || editor.isActive("highlight")}
                title="Highlight"
              >
                <div className="relative">
                  <Highlighter size={18} />
                  {editor.isActive("highlight") &&
                    editor.getAttributes("highlight").color && (
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            editor.getAttributes("highlight").color,
                        }}
                      />
                    )}
                </div>
              </ToolbarButton>
              {showHighlightPicker && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl p-3 z-50"
                  style={{ minWidth: "140px" }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {highlightColors.map((color) => (
                      <button
                        key={color.value}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHighlight(color.value);
                        }}
                        className="w-8 h-8 rounded border border-gray-300 hover:border-gray-500 hover:scale-110 transition-all cursor-pointer"
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Divider />

          {/* Undo/Redo */}
          <div className="flex items-center gap-0 ">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Subscript/Superscript */}
          <div className="flex items-center gap-0 ">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              active={editor.isActive("subscript")}
              title="Subscript"
            >
              <Subscript size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              active={editor.isActive("superscript")}
              title="Superscript"
            >
              <Superscript size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Undo/Redo */}
          <div className="flex items-center gap-0 ">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Subscript/Superscript */}
          <div className="flex items-center gap-0 ">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              active={editor.isActive("subscript")}
              title="Subscript"
            >
              <Subscript size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              active={editor.isActive("superscript")}
              title="Superscript"
            >
              <Superscript size={18} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Table */}
          <div
            className={`flex items-center gap-0 ${editor.isActive("table") ? "bg-blue-50 rounded px-1 py-0.5" : ""
              }`}
          >
            <ToolbarButton
              onClick={() => setShowTableModal(true)}
              active={editor.isActive("table")}
              title="Insert Table"
            >
              <Table size={18} />
            </ToolbarButton>
            {editor.isActive("table") && (
              <>
                <Divider />
                <ToolbarButton
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                  title="Add Column Before"
                >
                  <span className="text-xs font-medium">+Col</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  title="Add Column After"
                >
                  <span className="text-xs font-medium">Col+</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  title="Delete Column"
                >
                  <span className="text-xs font-medium">-Col</span>
                </ToolbarButton>
                <Divider />
                <ToolbarButton
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                  title="Add Row Before"
                >
                  <span className="text-xs font-medium">+Row</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  title="Add Row After"
                >
                  <span className="text-xs font-medium">Row+</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  title="Delete Row"
                >
                  <span className="text-xs font-medium">-Row</span>
                </ToolbarButton>
                <Divider />
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  title="Delete Table"
                >
                  <span className="text-xs font-medium text-red-600">Del</span>
                </ToolbarButton>
              </>
            )}
          </div>

          <Divider />

          {/* Media */}
          <div className="flex items-center gap-0">
            <ToolbarButton
              onClick={addLink}
              active={editor.isActive("link")}
              title="Add Link"
            >
              <Link size={18} />
            </ToolbarButton>
            <ToolbarButton onClick={addImage} title="Add Image">
              <Image size={18} />
            </ToolbarButton>
            <ToolbarButton onClick={addVideo} title="Add Video">
              <Video size={18} />
            </ToolbarButton>
            <ToolbarButton onClick={addButton} title="Add Button">
              <span className="text-xs font-medium">+BUTTON</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setShowHistory(true)}
              title="Image History"
            >
              <Clock size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              <Minus size={18} />
            </ToolbarButton>
          </div>
        </div>
      </div>

      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelectFile={handleFileSelect}
        onGenerateWithAI={() => {
          setShowImagePicker(false);
          setShowAIGenerator(true);
        }}
        onFromWeb={() => {
          setShowImagePicker(false);
          setShowWebImageModal(true);
        }}
        onFromHistory={() => {
          setShowImagePicker(false);
          setShowHistory(true);
        }}
      />

      {/* Image from Web (Attribution) Modal */}
      <ImageAttributionModal
        isOpen={showWebImageModal}
        onClose={() => setShowWebImageModal(false)}
        onInsert={handleInsertWebImage}
      />

      {/* AI Image Generator Modal */}
      <AIImageGeneratorModal
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onUseImage={handleUseGeneratedImage}
      />

      {/* Image History Modal */}
      <ImageHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectImage={handleSelectFromHistory}
      />

      {/* Table Modal */}
      <TableModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onInsert={(rows, cols) => {
          editor
            .chain()
            .focus()
            .insertTable({ rows, cols, withHeaderRow: true })
            .run();
        }}
      />

      {/* Video Modal */}
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onInsert={(url, align) => {
          handleInsertVideo(url, align);
        }}
      />

      {/* Quiz Modal */}
      <QuizModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onSelect={(quizId) => {
          handleInsertQuiz(quizId, "center");
        }}
      />

      {/* Button Modal */}
      <ButtonModal
        isOpen={showButtonModal}
        onClose={() => setShowButtonModal(false)}
        onInsert={handleInsertButton}
      />

      {/* Close pickers when clicking outside */}
      {(showColorPicker ||
        showHighlightPicker ||
        showLineSpacingPicker ||
        showFontSizePicker) && (
          <div
            className="fixed inset-0 z-40"
            onMouseDown={(e) => {
              // Only track if clicking on the backdrop itself (not a child)
              if (e.target === e.currentTarget) {
                dragStartRef.current = { x: e.clientX, y: e.clientY };
              }
            }}
            onMouseUp={(e) => {
              // Only close if clicking on the backdrop itself and it was a click (not a drag)
              if (e.target === e.currentTarget && dragStartRef.current) {
                const dx = Math.abs(e.clientX - dragStartRef.current.x);
                const dy = Math.abs(e.clientY - dragStartRef.current.y);
                // If moved less than 5px, it's a click, not a drag
                if (dx < 5 && dy < 5) {
                  setShowColorPicker(false);
                  setShowHighlightPicker(false);
                  setShowLineSpacingPicker(false);
                  setShowFontSizePicker(false);
                }
              }
              dragStartRef.current = null;
            }}
            onClick={(e) => {
              // Fallback: close on click if it's the backdrop
              if (e.target === e.currentTarget) {
                setShowColorPicker(false);
                setShowHighlightPicker(false);
                setShowLineSpacingPicker(false);
                setShowFontSizePicker(false);
              }
            }}
          />
        )}
    </div>
  );
}
