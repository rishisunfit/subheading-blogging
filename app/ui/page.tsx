"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import CodeBlock from "@tiptap/extension-code-block";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
  LayoutGrid,
  Edit3,
  FileText,
  Users,
  BarChart2,
  CreditCard,
  Search,
  ChevronDown,
  Monitor,
  Smartphone,
  ArrowUpRight,
  Calendar,
  Type,
  Image as ImageIcon,
  Code,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Quote,
  List,
  ListOrdered,
  Strikethrough,
  X,
  Check,
  Plus,
  Undo,
  Redo,
  Save,
  Download,
  Eye,
  Pilcrow,
  Space,
  AlignCenterHorizontal,
  Clock,
  Badge,
  Minus,
  MoreHorizontal,
  Sparkles,
  Trash2,
  FolderOpen,
  MessageSquare,
} from "lucide-react";
import {
  StyleExtension,
  FontSizeExtension,
} from "@/components/editor/StyleExtension";
import {
  CalloutExtension,
  calloutPresets,
} from "@/components/editor/CalloutExtension";
import { defaultStyles, TemplateStyles } from "@/services/templates";
import { postsApi, Post, PostStyles } from "@/services/posts";

// Font options
const fontOptions = [
  { name: "PT Serif", value: "PT Serif, Georgia, serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Merriweather", value: "Merriweather, Georgia, serif" },
  { name: "Playfair Display", value: "Playfair Display, Georgia, serif" },
  { name: "Lora", value: "Lora, Georgia, serif" },
  { name: "Inter", value: "Inter, system-ui, sans-serif" },
  { name: "Open Sans", value: "Open Sans, system-ui, sans-serif" },
  { name: "Roboto", value: "Roboto, system-ui, sans-serif" },
];

const fontWeights = [
  { name: "Light", value: "300" },
  { name: "Regular", value: "400" },
  { name: "Medium", value: "500" },
  { name: "Semi Bold", value: "600" },
  { name: "Bold", value: "700" },
];

// Default editorial content
const defaultEditorialContent = `
<div class="editorial-header text-xs tracking-widest text-gray-400 uppercase mb-4">The Editorial Review • Volume XXIII</div>

<h1>The Art of Modern Typography in Digital Design</h1>

<p class="subtitle text-xl italic text-gray-500 mb-8">A deep dive into how typefaces shape our digital experiences</p>

<div class="byline text-xs font-bold tracking-wide uppercase mb-12 border-b pb-4">By Jonathan Edwards • December 3, 2024</div>

<p>In an era where screens dominate our daily interactions, typography has emerged as the silent architect of digital experiences.</p>

<blockquote>"Typography is what language looks like. In the digital age, it's become the voice of our visual culture."</blockquote>

<h2>The Future of Typography</h2>

<p>As we look ahead, the intersection of artificial intelligence and typography promises new frontiers. Dynamic fonts that adapt to individual readers, responsive type that reshapes itself based on context, and AI-generated typefaces tailored to specific brands are no longer science fiction.</p>
`;

const EditorUI = () => {
  const [mode, setMode] = useState<"Basic" | "Advanced">("Basic");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(false);
  const [styles, setStyles] = useState<TemplateStyles>(defaultStyles);
  const [templateName, setTemplateName] = useState("Classic Editorial");
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showArticlesPanel, setShowArticlesPanel] = useState(false);
  const [savedArticles, setSavedArticles] = useState<Post[]>([]);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const [showCalloutPicker, setShowCalloutPicker] = useState(false);

  // Load saved articles on mount
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const articles = await postsApi.getAll();
      setSavedArticles(articles);
    } catch (error) {
      console.error("Error loading articles:", error);
    }
  };

  // Initialize TipTap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800 cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg my-4",
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      TextAlign.configure({
        types: [
          "heading",
          "paragraph",
          "bulletList",
          "orderedList",
          "listItem",
        ],
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      CodeBlock.configure({
        HTMLAttributes: {
          class: "bg-gray-100 rounded-lg p-4 font-mono text-sm",
        },
      }),
      Subscript,
      Superscript,
      StyleExtension,
      FontSizeExtension,
      CalloutExtension,
    ],
    content: defaultEditorialContent,
    editorProps: {
      attributes: {
        class:
          "editorial-content prose prose-lg max-w-none focus:outline-none min-h-[800px]",
      },
    },
  });

  // Update styles function
  const updateStyle = useCallback(
    (key: keyof TemplateStyles, value: string) => {
      setStyles((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Insert block at cursor position
  const insertBlock = useCallback(
    (type: string) => {
      if (!editor) return;

      switch (type) {
        case "title":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "text":
          editor.chain().focus().setParagraph().run();
          break;
        case "image": {
          const url = prompt("Enter image URL:");
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
          break;
        }
        case "byline":
          editor
            .chain()
            .focus()
            .insertContent(
              '<p class="byline text-xs font-bold tracking-wide uppercase mb-12 border-b pb-4">By Author Name • Date</p>'
            )
            .run();
          break;
        case "date":
          editor
            .chain()
            .focus()
            .insertContent(
              new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            )
            .run();
          break;
        case "code":
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case "quote":
          editor.chain().focus().toggleBlockquote().run();
          break;
        case "divider":
          editor.chain().focus().setHorizontalRule().run();
          break;
        case "centerspace":
          // Insert a centered empty line break (like hitting enter in centered mode)
          editor
            .chain()
            .focus()
            .insertContent('<p style="text-align: center;">&nbsp;</p>')
            .run();
          break;
        case "centerspace-large":
          // Insert two empty centered lines for section breaks
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center;">&nbsp;</p><p style="text-align: center;">&nbsp;</p>'
            )
            .run();
          break;
        case "center-all":
          // Select all and center align
          editor.chain().focus().selectAll().setTextAlign("center").run();
          break;
        case "reading-time":
          // Insert a stylish reading time badge using mark with background
          editor
            .chain()
            .focus()
            .insertContent('<p style="text-align: center;">')
            .insertContent({
              type: "text",
              text: "3 minute read",
              marks: [{ type: "highlight", attrs: { color: "#dbeafe" } }],
            })
            .insertContent("</p>")
            .run();
          break;
        case "badge":
          // Insert a badge with highlight
          editor
            .chain()
            .focus()
            .insertContent({
              type: "text",
              text: "BADGE",
              marks: [{ type: "highlight", attrs: { color: "#c7d2fe" } }],
            })
            .run();
          break;
        case "badge-outline":
          // Insert an outline-style badge (just bold + colored text)
          editor
            .chain()
            .focus()
            .insertContent({
              type: "text",
              text: "LABEL",
              marks: [
                { type: "bold" },
                { type: "textStyle", attrs: { color: "#6366f1" } },
              ],
            })
            .run();
          break;
        case "line-thin":
          // Thin elegant line
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 1.5rem 0;"><span class="decorative-line-thin">―――――――――</span></p>'
            )
            .run();
          break;
        case "line-dots":
          // Decorative dots line
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 1.5rem 0; letter-spacing: 0.5em; color: #9ca3af;">• • •</p>'
            )
            .run();
          break;
        case "line-ornament":
          // Ornamental divider
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 1.5rem 0; color: #6b7280;">✦ ✦ ✦</p>'
            )
            .run();
          break;
        case "line-wave":
          // Wave/tilde divider
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 1.5rem 0; color: #9ca3af; letter-spacing: 0.3em;">～～～</p>'
            )
            .run();
          break;
        case "line-thick":
          // Thick accent line
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 2rem 0;"><span style="display: inline-block; width: 60px; height: 3px; background: #000;"></span></p>'
            )
            .run();
          break;
        case "callout-yellow":
          editor
            .chain()
            .focus()
            .setCallout({ backgroundColor: "#FEF9C3", borderColor: "#CA8A04" })
            .run();
          break;
        case "callout-blue":
          editor
            .chain()
            .focus()
            .setCallout({ backgroundColor: "#DBEAFE", borderColor: "#2563EB" })
            .run();
          break;
        case "callout-green":
          editor
            .chain()
            .focus()
            .setCallout({ backgroundColor: "#DCFCE7", borderColor: "#16A34A" })
            .run();
          break;
        case "callout-red":
          editor
            .chain()
            .focus()
            .setCallout({ backgroundColor: "#FEE2E2", borderColor: "#DC2626" })
            .run();
          break;
        case "callout-purple":
          editor
            .chain()
            .focus()
            .setCallout({ backgroundColor: "#F3E8FF", borderColor: "#9333EA" })
            .run();
          break;
        case "callout-gray":
          editor
            .chain()
            .focus()
            .setCallout({ backgroundColor: "#F3F4F6", borderColor: "#6B7280" })
            .run();
          break;
      }
      setShowBlockMenu(false);
    },
    [editor]
  );

  // Handle add block button click
  const handleAddBlock = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setBlockMenuPosition({ top: rect.top, left: rect.left - 280 });
    setShowBlockMenu(true);
  }, []);

  // Save article (localStorage - no login required)
  const handleSaveArticle = async () => {
    setIsSaving(true);
    try {
      const content = editor?.getHTML() || "";

      if (currentArticleId) {
        // Update existing article
        await postsApi.update(currentArticleId, {
          title: templateName,
          content,
          styles: styles as PostStyles,
        });
      } else {
        // Create new article
        const newArticle = await postsApi.create({
          title: templateName,
          content,
          status: "draft",
          styles: styles as PostStyles,
        });
        setCurrentArticleId(newArticle.id);
      }

      await loadArticles(); // Refresh the list
      alert("Article saved successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error saving article:", errorMessage);
      alert(`Failed to save article: ${errorMessage}`);
    } finally {
      setIsSaving(false);
      setShowSaveDropdown(false);
    }
  };

  // Save as new article (always creates a new one)
  const handleSaveAsNewArticle = async () => {
    setIsSaving(true);
    try {
      const content = editor?.getHTML() || "";

      // Always create new article
      const newArticle = await postsApi.create({
        title: templateName,
        content,
        status: "draft",
        styles: styles as PostStyles,
      });
      setCurrentArticleId(newArticle.id);

      await loadArticles(); // Refresh the list
      alert("New article created successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error saving article:", errorMessage);
      alert(`Failed to save article: ${errorMessage}`);
    } finally {
      setIsSaving(false);
      setShowSaveDropdown(false);
    }
  };

  // Load an article into the editor
  const handleLoadArticle = (article: Post) => {
    editor?.commands.setContent(article.content);
    setTemplateName(article.title);
    if (article.styles) {
      setStyles(article.styles);
    }
    setCurrentArticleId(article.id);
    setShowArticlesPanel(false);
  };

  // Delete an article
  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      await postsApi.delete(articleId);
      await loadArticles();

      // If we deleted the current article, reset to new
      if (currentArticleId === articleId) {
        setCurrentArticleId(null);
        setTemplateName("Untitled Article");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error deleting article:", errorMessage);
      alert(`Failed to delete article: ${errorMessage}`);
    }
  };

  // Create a new article (reset editor)
  const handleNewArticle = () => {
    editor?.commands.setContent(defaultEditorialContent);
    setTemplateName("Untitled Article");
    setStyles(defaultStyles);
    setCurrentArticleId(null);
    setShowArticlesPanel(false);
  };

  // Export as HTML
  const handleExportHTML = () => {
    const content = editor?.getHTML() || "";
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateName}</title>
  <link href="https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: ${styles.bodyFont};
      font-weight: ${styles.bodyWeight};
      background-color: ${styles.backgroundColor};
      color: ${styles.textColor};
      max-width: 800px;
      margin: 0 auto;
      padding: 64px;
    }
    h1, h2, h3 {
      font-family: ${styles.headingFont};
      font-weight: ${styles.headingWeight};
    }
    a { color: ${styles.linkColor}; }
    blockquote {
      border-left: 4px solid ${styles.textColor};
      padding-left: 1.5rem;
      margin: 2rem 0;
      font-style: italic;
      font-size: 1.5rem;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveDropdown(false);
  };

  // Set link
  const handleSetLink = () => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  // Generate dynamic styles
  const editorStyles = {
    "--bg-color": styles.backgroundColor,
    "--text-color": styles.textColor,
    "--primary-color": styles.primaryColor,
    "--link-color": styles.linkColor,
    "--heading-font":
      fontOptions.find((f) => f.name === styles.headingFont)?.value ||
      styles.headingFont,
    "--heading-weight": styles.headingWeight,
    "--body-font":
      fontOptions.find((f) => f.name === styles.bodyFont)?.value ||
      styles.bodyFont,
    "--body-weight": styles.bodyWeight,
  } as React.CSSProperties;

  return (
    <div className="flex h-screen w-full bg-[#F3F4F6] text-slate-800 font-sans overflow-hidden">
      {/* LEFT SIDEBAR: Navigation */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6 shrink-0 z-20">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mb-2">
          B
        </div>
        <NavItem
          icon={<LayoutGrid size={20} />}
          tooltip="My Articles"
          active={showArticlesPanel}
          onClick={() => setShowArticlesPanel(!showArticlesPanel)}
        />
        <NavItem
          icon={<Edit3 size={20} />}
          active={!showArticlesPanel}
          tooltip="Editor"
          onClick={() => setShowArticlesPanel(false)}
        />
        <NavItem icon={<FileText size={20} />} tooltip="Templates" />
        <NavItem icon={<Users size={20} />} tooltip="Users" />
        <NavItem icon={<BarChart2 size={20} />} tooltip="Analytics" />
        <NavItem icon={<CreditCard size={20} />} tooltip="Billing" />
      </div>

      {/* ARTICLES PANEL */}
      {showArticlesPanel && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">My Articles</h2>
              <button
                onClick={() => setShowArticlesPanel(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <button
              onClick={handleNewArticle}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              New Article
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {savedArticles.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No saved articles yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  Write and save your first article!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedArticles.map((article) => (
                  <div
                    key={article.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      currentArticleId === article.id
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleLoadArticle(article)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              article.status === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {article.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(article.updated_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteArticle(article.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete article"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {/* Preview snippet */}
                    <div
                      className="mt-2 text-xs text-gray-400 line-clamp-2"
                      dangerouslySetInnerHTML={{
                        __html:
                          article.content
                            .replace(/<[^>]*>/g, " ")
                            .substring(0, 100) + "...",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CENTER AREA: The Editor */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded border border-gray-200">
              <ArrowUpRight size={16} />
            </button>
            <span className="text-sm text-gray-500">Articles</span>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-medium">
                Article
              </span>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="font-medium text-sm bg-transparent border-none outline-none focus:ring-0 w-auto"
                style={{ width: `${Math.max(templateName.length * 8, 100)}px` }}
              />
              <Edit3 size={12} className="text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Device Toggle */}
            <div className="flex bg-gray-100 rounded-md p-0.5 mr-4">
              <button
                onClick={() => setViewMode("desktop")}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === "desktop"
                    ? "bg-white shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <Monitor size={12} /> Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === "mobile" ? "bg-white shadow-sm" : "text-gray-500"
                }`}
              >
                <Smartphone size={12} /> Mobile
              </button>
            </div>

            {/* Preview Button */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded text-sm transition-all ${
                showPreview
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Eye size={14} /> {showPreview ? "Edit" : "Preview"}
            </button>

            {/* Save Dropdown */}
            <div className="relative">
              <div className="flex items-center">
                <button
                  onClick={handleSaveArticle}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-l hover:bg-black disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                  className="px-2 py-1.5 bg-gray-900 text-white border-l border-gray-700 rounded-r hover:bg-black"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {showSaveDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px] z-50">
                  <button
                    onClick={handleSaveArticle}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Save size={14} /> Save Article
                  </button>
                  <button
                    onClick={handleSaveAsNewArticle}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Plus size={14} /> Save as New Article
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleExportHTML}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download size={14} /> Export as HTML
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Formatting Toolbar */}
        {editor && !showPreview && (
          <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-1 shrink-0 overflow-x-auto">
            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo size={16} />
            </ToolbarButton>

            <Divider />

            {/* Normal Text & Headings */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setParagraph().run()}
              active={
                editor.isActive("paragraph") && !editor.isActive("heading")
              }
              title="Normal Text (convert heading to paragraph)"
            >
              <Pilcrow size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={16} />
            </ToolbarButton>

            <Divider />

            {/* Text Formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold (Ctrl+B)"
            >
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic (Ctrl+I)"
            >
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough size={16} />
            </ToolbarButton>

            <Divider />

            {/* Alignment */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
              title="Align Left"
            >
              <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              active={editor.isActive({ textAlign: "center" })}
              title="Align Center"
            >
              <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={editor.isActive({ textAlign: "right" })}
              title="Align Right"
            >
              <AlignRight size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertBlock("centerspace")}
              title="Insert Line Break"
            >
              <Space size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertBlock("center-all")}
              title="Center All Text"
            >
              <AlignCenterHorizontal size={16} />
            </ToolbarButton>

            <Divider />

            {/* Quick Colors (for your writing style) */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setColor("#000000").run()}
              title="Black Text"
            >
              <div className="w-4 h-4 rounded-full bg-black border border-gray-300" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setColor("#B8860B").run()}
              title="Gold Text"
            >
              <div className="w-4 h-4 rounded-full bg-yellow-600 border border-gray-300" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setColor("#DB2777").run()}
              title="Pink Text"
            >
              <div className="w-4 h-4 rounded-full bg-pink-600 border border-gray-300" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setColor("#16A34A").run()}
              title="Green Text"
            >
              <div className="w-4 h-4 rounded-full bg-green-600 border border-gray-300" />
            </ToolbarButton>

            <Divider />

            {/* Badges */}
            <ToolbarButton
              onClick={() => insertBlock("reading-time")}
              title="Insert Reading Time Badge"
            >
              <Clock size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertBlock("badge")}
              title="Insert Badge"
            >
              <Badge size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertBlock("line-dots")}
              title="Insert Divider (dots)"
            >
              <MoreHorizontal size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertBlock("line-thin")}
              title="Insert Divider (line)"
            >
              <Minus size={16} />
            </ToolbarButton>

            <Divider />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Bullet List"
            >
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </ToolbarButton>

            <Divider />

            {/* Quote & Code */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              title="Quote"
            >
              <Quote size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive("codeBlock")}
              title="Code Block"
            >
              <Code size={16} />
            </ToolbarButton>

            <Divider />

            {/* Link */}
            <ToolbarButton
              onClick={() => {
                if (editor.isActive("link")) {
                  editor.chain().focus().unsetLink().run();
                } else {
                  setShowLinkInput(true);
                }
              }}
              active={editor.isActive("link")}
              title="Add Link"
            >
              <LinkIcon size={16} />
            </ToolbarButton>

            {/* Image */}
            <ToolbarButton
              onClick={() => {
                const url = prompt("Enter image URL:");
                if (url) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              }}
              title="Add Image"
            >
              <ImageIcon size={16} />
            </ToolbarButton>

            <Divider />

            {/* Callout Box */}
            <div className="relative" id="callout-button-container">
              <ToolbarButton
                onClick={() => setShowCalloutPicker(!showCalloutPicker)}
                active={editor.isActive("callout")}
                title="Add Callout Box"
              >
                <MessageSquare size={16} />
              </ToolbarButton>
            </div>
          </div>
        )}

        {/* Callout Color Picker - Rendered outside toolbar to avoid clipping */}
        {showCalloutPicker && editor && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowCalloutPicker(false)}
            />
            <div
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50"
              style={{
                top: "120px", // Below toolbar
                right: "320px", // Positioned to the left of the right sidebar
              }}
            >
              <div className="text-xs text-gray-500 mb-2">
                Choose callout color
              </div>
              <div className="grid grid-cols-4 gap-2">
                {calloutPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setCallout({
                          backgroundColor: preset.bg,
                          borderColor: preset.border,
                        })
                        .run();
                      setShowCalloutPicker(false);
                    }}
                    className="w-8 h-8 rounded border-2 border-transparent hover:border-gray-400 transition-all"
                    style={{
                      backgroundColor: preset.bg,
                      borderLeftColor: preset.border,
                      borderLeftWidth: 3,
                    }}
                    title={preset.name}
                  />
                ))}
              </div>
              {editor.isActive("callout") && (
                <button
                  onClick={() => {
                    editor.chain().focus().unsetCallout().run();
                    setShowCalloutPicker(false);
                  }}
                  className="w-full mt-2 text-xs text-red-600 hover:bg-red-50 py-1 rounded"
                >
                  Remove Callout
                </button>
              )}
            </div>
          </>
        )}

        {/* Link Input Popup */}
        {showLinkInput && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex items-center gap-2 z-50">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              className="px-3 py-1.5 border border-gray-300 rounded text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSetLink()}
            />
            <button
              onClick={handleSetLink}
              className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              className="p-1.5 bg-gray-200 rounded hover:bg-gray-300"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Bubble Menu for selected text */}
        {editor && (
          <BubbleMenu
            editor={editor}
            className="bg-gray-900 rounded-lg shadow-xl p-1 flex items-center gap-1"
          >
            <BubbleButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
            >
              <Bold size={14} />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
            >
              <Italic size={14} />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
            >
              <UnderlineIcon size={14} />
            </BubbleButton>
            <div className="w-px h-4 bg-gray-600 mx-1" />
            <BubbleButton
              onClick={() => editor.chain().focus().setParagraph().run()}
              active={
                editor.isActive("paragraph") && !editor.isActive("heading")
              }
            >
              <Pilcrow size={14} />
            </BubbleButton>
            <BubbleButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={editor.isActive("heading", { level: 1 })}
            >
              H1
            </BubbleButton>
            <BubbleButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
            >
              H2
            </BubbleButton>
            <BubbleButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={editor.isActive("heading", { level: 3 })}
            >
              H3
            </BubbleButton>
            <div className="w-px h-4 bg-gray-600 mx-1" />
            <BubbleButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
            >
              <AlignLeft size={14} />
            </BubbleButton>
            <BubbleButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              active={editor.isActive({ textAlign: "center" })}
            >
              <AlignCenter size={14} />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={editor.isActive({ textAlign: "right" })}
            >
              <AlignRight size={14} />
            </BubbleButton>
            <div className="w-px h-4 bg-gray-600 mx-1" />
            <BubbleButton
              onClick={() => {
                const url = prompt("Enter URL:");
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              active={editor.isActive("link")}
            >
              <LinkIcon size={14} />
            </BubbleButton>
            <div className="w-px h-4 bg-gray-600 mx-1" />
            {/* Quick Colors */}
            <BubbleButton
              onClick={() => editor.chain().focus().setColor("#000000").run()}
            >
              <div className="w-3 h-3 rounded-full bg-black" />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().setColor("#B8860B").run()}
            >
              <div className="w-3 h-3 rounded-full bg-yellow-600" />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().setColor("#DB2777").run()}
            >
              <div className="w-3 h-3 rounded-full bg-pink-600" />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().setColor("#16A34A").run()}
            >
              <div className="w-3 h-3 rounded-full bg-green-600" />
            </BubbleButton>
          </BubbleMenu>
        )}

        {/* Scrollable Canvas Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 flex justify-center bg-[#F9FAFB]">
          <div
            className={`bg-white shadow-sm min-h-[1000px] relative transition-all duration-300 overflow-x-hidden ${
              viewMode === "mobile"
                ? "w-[430px] mobile-preview"
                : "w-full max-w-[800px]"
            }`}
            style={{
              ...editorStyles,
              backgroundColor: styles.backgroundColor,
              color: styles.textColor,
              fontFamily:
                fontOptions.find((f) => f.name === styles.bodyFont)?.value ||
                styles.bodyFont,
              fontWeight: styles.bodyWeight,
            }}
          >
            {/* Add Block Button (floating) */}
            {!showPreview && (
              <button
                onClick={handleAddBlock}
                className={`absolute top-16 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 shadow-sm transition-all ${
                  viewMode === "mobile" ? "-left-10" : "-left-12"
                }`}
              >
                <Plus size={16} />
              </button>
            )}

            {/* Editor or Preview Content */}
            <div
              className={viewMode === "mobile" ? "p-6" : "p-16"}
              style={{
                fontFamily: fontOptions.find((f) => f.name === styles.bodyFont)
                  ?.value,
              }}
            >
              {showPreview ? (
                <div
                  className="preview-content prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
                  style={{
                    fontFamily: fontOptions.find(
                      (f) => f.name === styles.bodyFont
                    )?.value,
                  }}
                />
              ) : (
                <EditorContent editor={editor} className="editorial-editor" />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Block Menu Popup */}
      {showBlockMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowBlockMenu(false)}
          />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-64"
            style={{ top: blockMenuPosition.top, left: blockMenuPosition.left }}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-sm">Add Block</span>
              <button onClick={() => setShowBlockMenu(false)}>
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <BlockMenuItem
                icon={
                  <span className="text-xl font-serif font-bold">
                    H<sub className="text-xs">1</sub>
                  </span>
                }
                label="Title"
                onClick={() => insertBlock("title")}
              />
              <BlockMenuItem
                icon={<Type size={20} />}
                label="Text"
                onClick={() => insertBlock("text")}
              />
              <BlockMenuItem
                icon={<ImageIcon size={20} />}
                label="Image"
                onClick={() => insertBlock("image")}
              />
              <BlockMenuItem
                icon={<span className="font-serif text-lg">T</span>}
                label="Byline"
                onClick={() => insertBlock("byline")}
              />
              <BlockMenuItem
                icon={<Calendar size={20} />}
                label="Date"
                onClick={() => insertBlock("date")}
              />
              <BlockMenuItem
                icon={<Code size={20} />}
                label="Code"
                onClick={() => insertBlock("code")}
              />
              <BlockMenuItem
                icon={<Quote size={20} />}
                label="Quote"
                onClick={() => insertBlock("quote")}
              />
              <BlockMenuItem
                icon={<div className="w-8 h-0.5 bg-gray-400" />}
                label="Divider"
                onClick={() => insertBlock("divider")}
              />
              <BlockMenuItem
                icon={<Space size={20} />}
                label="Space"
                onClick={() => insertBlock("centerspace")}
              />
              <BlockMenuItem
                icon={
                  <div className="flex flex-col gap-1">
                    <div className="w-6 h-0.5 bg-gray-300" />
                    <div className="w-6 h-0.5 bg-gray-300" />
                  </div>
                }
                label="Big Space"
                onClick={() => insertBlock("centerspace-large")}
              />
              <BlockMenuItem
                icon={<AlignCenterHorizontal size={20} />}
                label="Center All"
                onClick={() => insertBlock("center-all")}
              />
              <BlockMenuItem
                icon={<Clock size={20} />}
                label="Reading Time"
                onClick={() => insertBlock("reading-time")}
              />
              <BlockMenuItem
                icon={<Badge size={20} />}
                label="Badge"
                onClick={() => insertBlock("badge")}
              />
              <BlockMenuItem
                icon={
                  <div className="w-5 h-5 border-2 border-indigo-500 rounded-full" />
                }
                label="Outline Badge"
                onClick={() => insertBlock("badge-outline")}
              />
              <BlockMenuItem
                icon={<Minus size={20} />}
                label="Thin Line"
                onClick={() => insertBlock("line-thin")}
              />
              <BlockMenuItem
                icon={<MoreHorizontal size={20} />}
                label="Dots"
                onClick={() => insertBlock("line-dots")}
              />
              <BlockMenuItem
                icon={<Sparkles size={20} />}
                label="Stars"
                onClick={() => insertBlock("line-ornament")}
              />
              <BlockMenuItem
                icon={<div className="text-gray-400">～～</div>}
                label="Wave"
                onClick={() => insertBlock("line-wave")}
              />
              <BlockMenuItem
                icon={<div className="w-6 h-1 bg-gray-800 rounded" />}
                label="Thick Line"
                onClick={() => insertBlock("line-thick")}
              />
            </div>
            {/* Callout Boxes Section */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">
                Callout Boxes
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => insertBlock("callout-yellow")}
                  className="p-2 rounded border border-gray-100 hover:border-yellow-300 hover:bg-yellow-50 transition-all"
                  title="Yellow Callout"
                >
                  <div className="w-full h-6 rounded bg-yellow-100 border-l-4 border-yellow-500" />
                </button>
                <button
                  onClick={() => insertBlock("callout-blue")}
                  className="p-2 rounded border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  title="Blue Callout"
                >
                  <div className="w-full h-6 rounded bg-blue-100 border-l-4 border-blue-500" />
                </button>
                <button
                  onClick={() => insertBlock("callout-green")}
                  className="p-2 rounded border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all"
                  title="Green Callout"
                >
                  <div className="w-full h-6 rounded bg-green-100 border-l-4 border-green-500" />
                </button>
                <button
                  onClick={() => insertBlock("callout-red")}
                  className="p-2 rounded border border-gray-100 hover:border-red-300 hover:bg-red-50 transition-all"
                  title="Red Callout"
                >
                  <div className="w-full h-6 rounded bg-red-100 border-l-4 border-red-500" />
                </button>
                <button
                  onClick={() => insertBlock("callout-purple")}
                  className="p-2 rounded border border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  title="Purple Callout"
                >
                  <div className="w-full h-6 rounded bg-purple-100 border-l-4 border-purple-500" />
                </button>
                <button
                  onClick={() => insertBlock("callout-gray")}
                  className="p-2 rounded border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all"
                  title="Gray Callout"
                >
                  <div className="w-full h-6 rounded bg-gray-100 border-l-4 border-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* RIGHT SIDEBAR: Properties */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-gray-50 rounded border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="p-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMode("Basic")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
                mode === "Basic" ? "bg-white shadow-sm" : "text-gray-500"
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setMode("Advanced")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
                mode === "Advanced" ? "bg-white shadow-sm" : "text-gray-500"
              }`}
            >
              Advanced
            </button>
          </div>
        </div>

        {/* Controls Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Colors Section */}
          <div className="mb-6">
            <SectionHeader title="Colors" />
            <div className="space-y-3">
              <ColorInput
                label="Background"
                value={styles.backgroundColor}
                onChange={(v) => updateStyle("backgroundColor", v)}
              />
              <ColorInput
                label="Text on background"
                value={styles.textColor}
                onChange={(v) => updateStyle("textColor", v)}
              />
              <ColorInput
                label="Primary"
                value={styles.primaryColor}
                onChange={(v) => updateStyle("primaryColor", v)}
                info
              />
              <ColorInput
                label="Text on primary"
                value={styles.primaryTextColor}
                onChange={(v) => updateStyle("primaryTextColor", v)}
              />
              <ColorInput
                label="Secondary"
                value={styles.secondaryColor}
                onChange={(v) => updateStyle("secondaryColor", v)}
                info
              />
              <ColorInput
                label="Link text"
                value={styles.linkColor}
                onChange={(v) => updateStyle("linkColor", v)}
              />
            </div>
          </div>

          {/* Typography Section */}
          <div className="mb-6 border-t border-gray-100 pt-4">
            <SectionHeader title="Typography" />
            <div className="space-y-4">
              {/* Heading Typography */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Heading
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Font family</span>
                  <FontSelect
                    value={styles.headingFont}
                    onChange={(v) => updateStyle("headingFont", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Font weight</span>
                  <WeightSelect
                    value={styles.headingWeight}
                    onChange={(v) => updateStyle("headingWeight", v)}
                  />
                </div>
              </div>

              {/* Body Typography */}
              {mode === "Advanced" && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Body
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Font family</span>
                    <FontSelect
                      value={styles.bodyFont}
                      onChange={(v) => updateStyle("bodyFont", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Font weight</span>
                    <WeightSelect
                      value={styles.bodyWeight}
                      onChange={(v) => updateStyle("bodyWeight", v)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preset Templates */}
          {mode === "Advanced" && (
            <div className="mb-6 border-t border-gray-100 pt-4">
              <SectionHeader title="Quick Presets" />
              <div className="grid grid-cols-2 gap-2">
                <PresetButton
                  label="Editorial"
                  onClick={() =>
                    setStyles({
                      ...defaultStyles,
                      headingFont: "PT Serif",
                      bodyFont: "Georgia",
                    })
                  }
                />
                <PresetButton
                  label="Modern"
                  onClick={() =>
                    setStyles({
                      ...defaultStyles,
                      backgroundColor: "#1F2937",
                      textColor: "#F9FAFB",
                      headingFont: "Inter",
                      bodyFont: "Inter",
                      linkColor: "#60A5FA",
                    })
                  }
                />
                <PresetButton
                  label="Minimal"
                  onClick={() =>
                    setStyles({
                      ...defaultStyles,
                      headingFont: "Inter",
                      bodyFont: "Inter",
                      primaryColor: "#000000",
                    })
                  }
                />
                <PresetButton
                  label="Warm"
                  onClick={() =>
                    setStyles({
                      ...defaultStyles,
                      backgroundColor: "#FFFBEB",
                      textColor: "#78350F",
                      primaryColor: "#D97706",
                      linkColor: "#B45309",
                      headingFont: "Playfair Display",
                      bodyFont: "Lora",
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close save dropdown when clicking outside */}
      {showSaveDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSaveDropdown(false)}
        />
      )}
    </div>
  );
};

// Helper Components
const NavItem = ({
  icon,
  active,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  active?: boolean;
  tooltip?: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg transition-colors relative group ${
      active
        ? "bg-indigo-50 text-indigo-600"
        : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
    }`}
    title={tooltip}
  >
    {icon}
    {tooltip && (
      <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
        {tooltip}
      </span>
    )}
  </button>
);

const ToolbarButton = ({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded transition-colors ${
      active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    title={title}
  >
    {children}
  </button>
);

const BubbleButton = ({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`p-1.5 rounded text-sm font-medium transition-colors ${
      active ? "bg-white text-gray-900" : "text-gray-300 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-6 bg-gray-200 mx-1" />;

const BlockMenuItem = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="border border-gray-100 hover:bg-gray-50 hover:border-gray-200 rounded p-3 flex flex-col items-center justify-center cursor-pointer transition-all"
  >
    <span className="text-gray-700">{icon}</span>
    <span className="text-xs mt-1 text-gray-500">{label}</span>
  </button>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex justify-between items-center mb-3">
    <span className="font-semibold text-sm">{title}</span>
    <ChevronDown size={14} className="text-gray-400" />
  </div>
);

const ColorInput = ({
  label,
  value,
  onChange,
  info,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  info?: boolean;
}) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      {info && (
        <div className="w-3 h-3 rounded-full border border-gray-300 flex items-center justify-center text-[8px] text-gray-400 cursor-help">
          i
        </div>
      )}
    </div>
    <div className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 transition-colors cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-4 h-4 rounded-sm border-0 cursor-pointer"
        style={{ padding: 0 }}
      />
      <span className="text-xs font-mono text-gray-600 uppercase">{value}</span>
    </div>
  </div>
);

const FontSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer w-32 justify-between hover:border-gray-300"
      >
        <span className="text-sm truncate">{value}</span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 w-44 max-h-60 overflow-y-auto">
            {fontOptions.map((font) => (
              <button
                key={font.name}
                onClick={() => {
                  onChange(font.name);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                  value === font.name ? "bg-indigo-50 text-indigo-700" : ""
                }`}
                style={{ fontFamily: font.value }}
              >
                {font.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const WeightSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentWeight =
    fontWeights.find((w) => w.value === value) || fontWeights[1];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer w-32 justify-between hover:border-gray-300"
      >
        <span className="text-sm">{currentWeight.name}</span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 w-32">
            {fontWeights.map((weight) => (
              <button
                key={weight.value}
                onClick={() => {
                  onChange(weight.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                  value === weight.value ? "bg-indigo-50 text-indigo-700" : ""
                }`}
                style={{ fontWeight: weight.value }}
              >
                {weight.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const PresetButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-all"
  >
    {label}
  </button>
);

export default EditorUI;
