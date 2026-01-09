/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { ImageExtension } from "./ImageExtension";
import { VideoExtension } from "./VideoExtension";
import { QuizExtension } from "./QuizExtension";
import { ButtonExtension } from "./ButtonExtension";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import CodeBlock from "@tiptap/extension-code-block";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
  ArrowLeft,
  Eye,
  Save,
  Settings,
  ChevronDown,
  Monitor,
  Smartphone,
  Download,
  LayoutGrid,
  Edit3,
  FileText,
  Users,
  BarChart2,
  CreditCard,
  Search,
  X,
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
  Check,
  Plus,
  Undo,
  Redo,
  Pilcrow,
  Space,
  AlignCenterHorizontal,
  Clock,
  Badge,
  Minus,
  MoreHorizontal,
  Sparkles,
  MessageSquare,
  Video,
  Eraser,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StyleExtension, FontSizeExtension } from "./StyleExtension";
import { CalloutExtension, calloutPresets } from "./CalloutExtension";
import { BubbleMenu } from "@tiptap/react/menus";
import { PostSettingsModal } from "./PostSettingsModal";
import { AnalyticsDrawer } from "./AnalyticsDrawer";
import {
  normalizeTemplateData,
  type PostTemplateData,
} from "@/services/postTemplate";
import { ReactionBar } from "@/components/viewer/ReactionBar";
import { QuizRenderer } from "@/components/viewer/QuizRenderer";
import { CTAForm } from "@/components/viewer/CTAForm";
import { ImagePickerModal } from "./ImagePickerModal";
import { ImageHistoryModal } from "./ImageHistoryModal";
import { AIImageGeneratorModal } from "./AIImageGeneratorModal";
import {
  ImageAttributionModal,
  type ImageAttributionValues,
} from "./ImageAttributionModal";
import { VideoModal } from "./VideoModal";
import { VideoTimestampModal } from "./VideoTimestampModal";
import { QuizModal } from "./QuizModal";
import { ButtonModal, type ButtonConfig } from "./ButtonModal";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { NodeSelection } from "prosemirror-state";
import { uploadImageToStorage, uploadDataURLToStorage } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { mediaApi } from "@/services/media";
import { defaultStyles, TemplateStyles } from "@/services/templates";
import { PostStyles } from "@/services/posts";

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

// Helper to build Cloudflare embed URL
function buildCloudflareEmbedUrl(
  videoId: string,
  customerCode: string | null = null,
  primaryColor?: string | null
): string {
  const code =
    customerCode || process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;
  if (!code) {
    console.error("Customer code is required for Cloudflare Stream embed URL");
    return "";
  }
  const baseUrl = `https://customer-${code}.cloudflarestream.com/${videoId}/iframe`;
  const params = new URLSearchParams();
  if (primaryColor) {
    params.append("primaryColor", primaryColor);
  }
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

interface EditorProps {
  postId?: string;
  initialTemplateData?: PostTemplateData;
  initialContent?: string;
  initialQuizId?: string | null;
  initialRatingEnabled?: boolean;
  initialCtaEnabled?: boolean;
  initialComponentOrder?: string[];
  initialStyles?: PostStyles;
  initialFolderId?: string | null;
  initialPostSlug?: string | null;
  initialNextPostId?: string | null;
  initialQuizShowResponsesPreview?: boolean;
  initialQuizSkipContactCollection?: boolean;
  initialQuizShowDescription?: boolean;
  initialQuizShowResponsesButton?: boolean;
  onBack: () => void;
  onPreview: () => void;
  onSave: (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent?: boolean
  ) => void;
  onSaveDraft?: (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent?: boolean
  ) => void;
  onPublish?: (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent?: boolean
  ) => void;
  onAutoSave?: (
    template: PostTemplateData,
    content: string,
    styles?: PostStyles,
    silent?: boolean
  ) => void;
  onUpdateQuizId?: (quizId: string | null) => void;
  onUpdateRatingEnabled?: (enabled: boolean) => void;
  onUpdateCtaEnabled?: (enabled: boolean) => void;
  onUpdateComponentOrder?: (order: string[]) => void;
  onUpdateFolderId?: (folderId: string | null) => void;
  onUpdatePostSlug?: (postSlug: string | null) => void;
  onUpdateNextPostId?: (nextPostId: string | null) => void;
  onUpdateQuizShowResponsesPreview?: (enabled: boolean) => void;
  onUpdateQuizSkipContactCollection?: (enabled: boolean) => void;
  onUpdateQuizShowDescription?: (enabled: boolean) => void;
  onUpdateQuizShowResponsesButton?: (enabled: boolean) => void;
}

export function Editor({
  postId,
  initialTemplateData,
  initialContent = "",
  initialQuizId = null,
  initialRatingEnabled = true,
  initialCtaEnabled = true,
  initialStyles,
  initialFolderId = null,
  initialPostSlug = null,
  initialNextPostId = null,
  initialQuizShowResponsesPreview = false,
  initialQuizSkipContactCollection = false,
  initialQuizShowDescription = true,
  initialQuizShowResponsesButton = false,
  onBack,
  onSave,
  onSaveDraft,
  onPublish,
  onAutoSave,
  onUpdateQuizId,
  onUpdateRatingEnabled,
  onUpdateCtaEnabled,
  onUpdateComponentOrder,
  onUpdateFolderId,
  onUpdatePostSlug,
  onUpdateNextPostId,
  onUpdateQuizShowResponsesPreview,
  onUpdateQuizSkipContactCollection,
  onUpdateQuizShowDescription,
  onUpdateQuizShowResponsesButton,
  initialComponentOrder = ["quiz", "rating", "cta", "nextArticle"],
}: EditorProps) {
  const [templateData, setTemplateData] = useState<PostTemplateData>(() =>
    normalizeTemplateData(initialTemplateData)
  );
  const [quizId, setQuizId] = useState<string | null>(initialQuizId);
  const [ratingEnabled, setRatingEnabled] =
    useState<boolean>(initialRatingEnabled);
  const [ctaEnabled, setCtaEnabled] = useState<boolean>(
    initialCtaEnabled ?? true
  );
  const [componentOrder, setComponentOrder] = useState<string[]>(
    initialComponentOrder
  );
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [postSlug, setPostSlug] = useState<string | null>(initialPostSlug);
  const [nextPostId, setNextPostId] = useState<string | null>(initialNextPostId);
  const [quizShowResponsesPreview, setQuizShowResponsesPreview] = useState<boolean>(
    initialQuizShowResponsesPreview
  );
  const [quizSkipContactCollection, setQuizSkipContactCollection] = useState<boolean>(
    initialQuizSkipContactCollection
  );
  const [quizShowDescription, setQuizShowDescription] = useState<boolean>(
    initialQuizShowDescription
  );
  const [quizShowResponsesButton, setQuizShowResponsesButton] = useState<boolean>(
    initialQuizShowResponsesButton
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"Basic" | "Advanced">("Basic");
  const [styles, setStyles] = useState<TemplateStyles>(
    initialStyles || defaultStyles
  );
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showImageHistory, setShowImageHistory] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showWebImageModal, setShowWebImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVideoTimestampModal, setShowVideoTimestampModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<{
    videoId: string;
    customerCode: string | null;
    primaryColor: string | null;
    align: string;
    autoplay: boolean;
    showDuration: boolean;
    showBackground: boolean;
    title?: string;
  } | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [showCalloutPicker, setShowCalloutPicker] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState("#3B82F6");
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showBubbleFontPicker, setShowBubbleFontPicker] = useState(false);
  const [showBubbleSizePicker, setShowBubbleSizePicker] = useState(false);

  // Font sizes like Google Docs
  const fontSizes = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];

  // Clean blog fonts
  const blogFonts = [
    { name: "Default", value: "inherit", preview: "Aa" },
    { name: "Georgia", value: "Georgia, serif", preview: "Aa" },
    { name: "Lora", value: "'Lora', serif", preview: "Aa" },
    { name: "Merriweather", value: "'Merriweather', serif", preview: "Aa" },
    { name: "Playfair Display", value: "'Playfair Display', serif", preview: "Aa" },
    { name: "Open Sans", value: "'Open Sans', sans-serif", preview: "Aa" },
    { name: "Roboto", value: "'Roboto', sans-serif", preview: "Aa" },
    { name: "Lato", value: "'Lato', sans-serif", preview: "Aa" },
    { name: "Source Sans Pro", value: "'Source Sans Pro', sans-serif", preview: "Aa" },
    { name: "Nunito", value: "'Nunito', sans-serif", preview: "Aa" },
    { name: "PT Serif", value: "'PT Serif', serif", preview: "Aa" },
  ];
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedContent = useRef<string>(initialContent);
  const lastSavedTemplate = useRef<PostTemplateData>(
    normalizeTemplateData(initialTemplateData)
  );
  const lastSavedStyles = useRef<TemplateStyles>(
    initialStyles || defaultStyles
  );
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const subtitleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const openedForVideo = useRef(false);
  const { user } = useAuth();

  const editor = useEditor({
    immediatelyRender: false,
    editable: !showPreview,
    onUpdate: () => {
      // Force re-render to update undo/redo button states
    },
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800 cursor-pointer",
        },
      }),
      ImageExtension,
      VideoExtension,
      QuizExtension,
      ButtonExtension,
      Placeholder.configure({
        placeholder: "Start writing your story...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph", "listItem"],
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      FontFamily,
      Color,
      CodeBlock.configure({
        HTMLAttributes: {
          class: "bg-gray-100 rounded-lg p-4 font-mono text-sm",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "list-none pl-0",
        },
      }),
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Subscript,
      Superscript,
      StyleExtension,
      FontSizeExtension,
      CalloutExtension,
    ],
    content: initialContent || "<p></p>",
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none px-4 py-8",
      },
    },
  });

  // Update editor editable state when preview mode changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!showPreview);
    }
  }, [editor, showPreview]);

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
        case "image":
          setShowImagePicker(true);
          break;
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
          editor
            .chain()
            .focus()
            .insertContent('<p style="text-align: center;">&nbsp;</p>')
            .run();
          break;
        case "centerspace-large":
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center;">&nbsp;</p><p style="text-align: center;">&nbsp;</p>'
            )
            .run();
          break;
        case "center-all":
          editor.chain().focus().selectAll().setTextAlign("center").run();
          break;
        case "reading-time":
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
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 1.5rem 0;"><span class="decorative-line-thin">―――――――――</span></p>'
            )
            .run();
          break;
        case "line-dots":
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 1.5rem 0; letter-spacing: 0.5em; color: #9ca3af;">• • •</p>'
            )
            .run();
          break;
        case "line-ornament":
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 1.5rem 0; color: #6b7280;">✦ ✦ ✦</p>'
            )
            .run();
          break;
        case "line-wave":
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 1.5rem 0; color: #9ca3af; letter-spacing: 0.3em;">～～～</p>'
            )
            .run();
          break;
        case "line-thick":
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="text-align: center; margin: 2rem 0;"><span style="display: inline-block; width: 60px; height: 3px; background: #000;"></span></p>'
            )
            .run();
          break;
        case "line-full":
          editor.chain().focus().setHorizontalRule().run();
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

  // Image handlers
  const handleFileSelect = async (file: File) => {
    if (!user) {
      alert("You must be logged in to upload images");
      return;
    }

    try {
      const imageUrl = await uploadImageToStorage(file, user.id);
      editor?.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();

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
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    }
  };

  const handleUseGeneratedImage = async (imageUrl: string) => {
    if (!user) {
      alert("You must be logged in to use images");
      return;
    }

    try {
      const uploadedUrl = await uploadDataURLToStorage(
        imageUrl,
        user.id,
        "generated-image.png"
      );
      editor
        ?.chain()
        .focus()
        .setImage({ src: uploadedUrl, alt: "Generated image" })
        .run();
    } catch (error) {
      console.error("Error uploading generated image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    }
  };

  const handleSelectFromHistory = (imageUrl: string) => {
    editor
      ?.chain()
      .focus()
      .setImage({ src: imageUrl, alt: "Image from history" })
      .run();
  };

  const handleInsertWebImage = async (values: ImageAttributionValues) => {
    editor
      ?.chain()
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
          align: "center",
        },
      })
      .run();

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
      }
    }
  };

  // Video handler
  const handleInsertVideo = (
    url: string,
    align: "left" | "center" | "right" = "center",
    primaryColor?: string,
    title?: string
  ) => {
    editor
      ?.chain()
      .focus()
      .setVideo({
        src: url,
        align: align || "center",
        primaryColor: primaryColor,
        title: title,
      })
      .run();
  };

  // Quiz handler
  const handleInsertQuiz = (
    quizId: string,
    align: "left" | "center" | "right" = "center"
  ) => {
    editor
      ?.chain()
      .focus()
      .setQuiz({
        quizId: quizId,
        align: align || "center",
      })
      .run();
  };

  // Button handler
  const handleInsertButton = (buttonConfig: ButtonConfig) => {
    editor?.chain().focus().setButton(buttonConfig).run();
  };

  // Set link
  const handleSetLink = () => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!editor) return;

      // Get current content directly from editor - don't modify it
      const content = editor.getHTML() || "";

      // Save the current state as-is - don't reset or modify it
      if (onPublish) {
        await onPublish(templateData, content, styles as PostStyles);
      } else {
        await onSave(templateData, content, styles as PostStyles);
      }

      // Update saved state after successful save
      lastSavedContent.current = content;
      lastSavedTemplate.current = { ...templateData };
      lastSavedStyles.current = { ...styles };
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
      setShowSaveDropdown(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      if (!editor) return;

      // Get current content directly from editor - don't modify it
      const content = editor.getHTML() || "";

      // Save the current state as-is - don't reset or modify it
      if (onSaveDraft) {
        await onSaveDraft(templateData, content, styles as PostStyles);
      } else {
        await onSave(templateData, content, styles as PostStyles);
      }

      // Update saved state after successful save
      lastSavedContent.current = content;
      lastSavedTemplate.current = { ...templateData };
      lastSavedStyles.current = { ...styles };
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving draft:", error);
    } finally {
      setIsSaving(false);
      setShowSaveDropdown(false);
    }
  };

  const handlePreview = () => {
    // Auto-save content before preview (silently) - preserve current status
    const content = editor?.getHTML() || "";
    if (onAutoSave) {
      onAutoSave(templateData, content, styles as PostStyles, true);
    } else if (onSaveDraft) {
      // Fallback to saveDraft if onAutoSave not provided
      onSaveDraft(templateData, content, styles as PostStyles, true);
    } else {
      onSave(templateData, content, styles as PostStyles, true);
    }
    if (showPreview) {
      setShowPreview(false);
    } else {
      setShowPreview(true);
    }
  };

  const escapeHtml = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const renderHeaderHtml = (t: PostTemplateData) => {
    const seriesName = escapeHtml(t.seriesName || "");
    const volume = escapeHtml(t.volume || "");
    const title = escapeHtml(t.title || "");
    const subtitle = escapeHtml(t.subtitle || "");
    const authorName = escapeHtml(t.authorName || "");
    const date = escapeHtml(t.date || "");

    const hasSeries = Boolean(seriesName || volume);
    const hasTitle = Boolean(title);
    const hasSubtitle = Boolean(subtitle);
    const hasByline = Boolean(authorName || date);

    if (!hasSeries && !hasTitle && !hasSubtitle && !hasByline) return "";

    return `
<header class="post-header">
  ${hasSeries
        ? `<div class="post-series">${seriesName}${seriesName && volume ? ` <span class="dot">•</span> ` : ""
        }${volume || ""}</div>`
        : ""
      }
  ${hasTitle ? `<h1 class="post-title">${title}</h1>` : ""}
  ${hasSubtitle ? `<p class="post-subtitle">${subtitle}</p>` : ""}
  ${hasByline
        ? `<div class="post-byline">${authorName ? `By ${authorName}` : ""}${authorName && date ? ` <span class="dot">•</span> ` : ""
        }${date || ""}</div>`
        : ""
      }
</header>`;
  };

  // Export as HTML
  const handleExportHTML = () => {
    const content = editor?.getHTML() || "";
    const headerHtml = renderHeaderHtml(templateData);
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(templateData.title || "Untitled Post")}</title>
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
    .post-header { margin-bottom: 2.5rem; }
    .post-series { text-align: center; font-size: 0.75rem; letter-spacing: 0.15em; font-weight: 700; text-transform: uppercase; margin-bottom: 1rem; opacity: 0.85; }
    .post-title { text-align: center; margin: 0 0 1rem; }
    .post-subtitle { text-align: center; margin: 0 0 1.5rem; font-style: italic; opacity: 0.9; }
    .post-byline { text-align: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; margin-bottom: 2rem; opacity: 0.85; }
    .dot { opacity: 0.7; }
  </style>
</head>
<body>
  ${headerHtml}
  ${content}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = (templateData.title || "untitled-post")
      .toLowerCase()
      .replace(/\s+/g, "-");
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveDropdown(false);
  };

  // Track if we've initialized the editor content
  const hasInitialized = useRef(false);
  const lastInitialContentRef = useRef<string | any>(null);

  // Update editor content when initialContent changes (e.g., when post loads)
  useEffect(() => {
    if (!editor) return;

    // Check if this is the first initialization or if content has changed
    const isFirstInit = !hasInitialized.current;
    const contentChanged = lastInitialContentRef.current !== initialContent;

    if (!isFirstInit && !contentChanged) {
      return; // Content hasn't changed, don't reinitialize
    }

    // Update the ref
    lastInitialContentRef.current = initialContent;
    hasInitialized.current = true;

    // Determine what content to set (body-only editor)
    if (
      !initialContent ||
      (typeof initialContent === "string" && initialContent.trim() === "")
    ) {
      editor.commands.setContent("<p></p>");
    } else {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]); // Depend on initialContent so it updates when post loads

  // Initialize template data when prop changes (mainly on mount / key remount)
  const hasInitializedTemplate = useRef(false);
  const lastInitialTemplateRef = useRef<PostTemplateData | undefined>(
    undefined
  );
  useEffect(() => {
    const changed = lastInitialTemplateRef.current !== initialTemplateData;
    if (hasInitializedTemplate.current && !changed) return;
    lastInitialTemplateRef.current = initialTemplateData;
    hasInitializedTemplate.current = true;
    setTemplateData(normalizeTemplateData(initialTemplateData));
  }, [initialTemplateData]);

  // Handle back button with unsaved changes check
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      onBack();
    }
  };

  // Discard changes and go back
  const handleDiscardAndGoBack = () => {
    setShowUnsavedChangesModal(false);
    setHasUnsavedChanges(false);
    onBack();
  };

  // Save draft and go back
  const handleSaveDraftAndGoBack = async () => {
    setShowUnsavedChangesModal(false);
    await handleSaveDraft();
    onBack();
  };

  // Initialize saved state refs
  useEffect(() => {
    if (editor) {
      lastSavedContent.current = editor.getHTML();
      lastSavedTemplate.current = { ...templateData };
      lastSavedStyles.current = { ...styles };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]); // only on initial editor creation

  // Check for unsaved changes whenever content, title, or styles change
  useEffect(() => {
    if (!editor) return;

    const checkUnsavedChanges = () => {
      const currentContent = editor.getHTML();
      const currentTemplate = templateData;
      const currentStyles = styles;

      const contentChanged = currentContent !== lastSavedContent.current;
      const templateChanged =
        JSON.stringify(currentTemplate) !==
        JSON.stringify(lastSavedTemplate.current);
      const stylesChanged =
        JSON.stringify(currentStyles) !==
        JSON.stringify(lastSavedStyles.current);

      setHasUnsavedChanges(contentChanged || templateChanged || stylesChanged);
    };

    // Check on editor updates
    const handleUpdate = () => {
      checkUnsavedChanges();
    };

    editor.on("update", handleUpdate);
    checkUnsavedChanges(); // Initial check

    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, templateData, styles]);

  // Auto-resize title and subtitle textareas
  useEffect(() => {
    const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };
    resizeTextarea(titleTextareaRef.current);
    resizeTextarea(subtitleTextareaRef.current);
  }, [templateData.title, templateData.subtitle]);

  // Track video selection
  useEffect(() => {
    if (!editor) return;

    const updateVideoSelection = () => {
      const { selection } = editor.state;
      if (
        selection instanceof NodeSelection &&
        selection.node.type.name === "video"
      ) {
        // Auto-open sidebar if not open
        if (!showRightSidebar) {
          setShowRightSidebar(true);
          openedForVideo.current = true;
        }

        const node = selection.node;
        const videoId = node.attrs.videoId || node.attrs.src;
        let finalVideoId = videoId;
        let finalCustomerCode = node.attrs.customerCode;

        // Extract video ID from URL if needed
        if (videoId && videoId.includes("cloudflarestream.com")) {
          // Try iframe pattern
          const match = videoId.match(
            /customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9]+)\/iframe/
          );
          if (match && match[2]) {
            finalVideoId = match[2];
            finalCustomerCode = match[1];
          } else {
            // Try manifest pattern
            const match2 = videoId.match(
              /customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9]+)\/manifest\/video\.m3u8/
            );
            if (match2 && match2[2]) {
              finalVideoId = match2[2];
              finalCustomerCode = match2[1];
            } else {
              // Try general pattern
              const match3 = videoId.match(
                /customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([a-zA-Z0-9]+)/
              );
              if (match3 && match3[2]) {
                finalVideoId = match3[2];
                finalCustomerCode = match3[1];
              }
            }
          }
        }

        setSelectedVideo({
          videoId: finalVideoId,
          customerCode: finalCustomerCode,
          primaryColor: node.attrs.primaryColor || null,
          align: node.attrs.align || "center",
          autoplay: node.attrs.autoplay !== false,
          showDuration: node.attrs.showDuration !== false,
          showBackground: node.attrs.showBackground !== false,
          title: node.attrs.title || "",
        });
      } else {
        // Close sidebar if it was auto-opened for video
        if (openedForVideo.current) {
          setShowRightSidebar(false);
          openedForVideo.current = false;
        }
        setSelectedVideo(null);
      }
    };

    editor.on("selectionUpdate", updateVideoSelection);
    editor.on("transaction", updateVideoSelection);
    updateVideoSelection(); // Initial check

    return () => {
      editor.off("selectionUpdate", updateVideoSelection);
      editor.off("transaction", updateVideoSelection);
    };
  }, [editor, showRightSidebar]);

  // Close sidebar when clicking outside if it was auto-opened for video
  useEffect(() => {
    if (!selectedVideo) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is on the video node itself
      const isVideoClick = target.closest('.video-wrapper');
      // Check if click is on the sidebar
      const isSidebarClick = target.closest('.w-80.bg-white.border-l');

      // If clicking outside both video and sidebar, deselect the video
      if (!isVideoClick && !isSidebarClick && openedForVideo.current) {
        // Deselect by clicking elsewhere in the editor
        if (editor) {
          editor.commands.focus();
          editor.commands.setTextSelection(0);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedVideo, editor]);

  // Handle video theme color change
  const handleVideoThemeChange = useCallback(
    (color: string) => {
      if (!editor || !selectedVideo) return;

      const { state } = editor;
      const { selection } = state;

      if (
        !(selection instanceof NodeSelection) ||
        selection.node.type.name !== "video"
      ) {
        return;
      }

      const videoPos = selection.from;
      editor.commands.command(({ tr }) => {
        const node = tr.doc.nodeAt(videoPos);
        if (!node || node.type.name !== "video") return false;
        tr.setNodeMarkup(videoPos, undefined, {
          ...node.attrs,
          primaryColor: color,
        });
        tr.setSelection(NodeSelection.create(tr.doc, videoPos));
        return true;
      });

      // Update local state
      setSelectedVideo({
        ...selectedVideo,
        primaryColor: color,
      });
    },
    [editor, selectedVideo]
  );

  // Handle video alignment change
  const handleVideoAlignChange = useCallback(
    (align: "left" | "center" | "right") => {
      if (!editor || !selectedVideo) return;

      const { state } = editor;
      const { selection } = state;

      if (
        !(selection instanceof NodeSelection) ||
        selection.node.type.name !== "video"
      ) {
        return;
      }

      const videoPos = selection.from;
      editor.commands.command(({ tr }) => {
        const node = tr.doc.nodeAt(videoPos);
        if (!node || node.type.name !== "video") return false;
        tr.setNodeMarkup(videoPos, undefined, {
          ...node.attrs,
          align,
        });
        tr.setSelection(NodeSelection.create(tr.doc, videoPos));
        return true;
      });

      // Update local state
      setSelectedVideo({
        ...selectedVideo,
        align,
      });
    },
    [editor, selectedVideo]
  );

  // Handle video settings change
  const handleVideoSettingChange = useCallback(
    (
      key: "autoplay" | "showDuration" | "showBackground" | "title",
      value: boolean | string
    ) => {
      if (!editor || !selectedVideo) return;

      const { state } = editor;
      const { selection } = state;

      if (
        !(selection instanceof NodeSelection) ||
        selection.node.type.name !== "video"
      ) {
        return;
      }

      const videoPos = selection.from;
      editor.commands.command(({ tr }) => {
        const node = tr.doc.nodeAt(videoPos);
        if (!node || node.type.name !== "video") return false;
        tr.setNodeMarkup(videoPos, undefined, {
          ...node.attrs,
          [key]: value,
        });
        tr.setSelection(NodeSelection.create(tr.doc, videoPos));
        return true;
      });

      // Update local state
      setSelectedVideo({
        ...selectedVideo,
        [key]: value,
      });
    },
    [editor, selectedVideo]
  );

  // Handle delete video
  const handleDeleteVideo = useCallback(() => {
    if (!editor || !selectedVideo) return;

    const { state } = editor;
    const { selection } = state;

    if (
      !(selection instanceof NodeSelection) ||
      selection.node.type.name !== "video"
    ) {
      return;
    }

    const videoPos = selection.from;
    editor.commands.command(({ tr }) => {
      tr.setSelection(NodeSelection.create(tr.doc, videoPos));
      tr.deleteSelection();
      return true;
    });
    editor.commands.focus();
    setSelectedVideo(null);
  }, [editor, selectedVideo]);

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
          tooltip="Dashboard"
          onClick={onBack}
        />
        <NavItem icon={<Edit3 size={20} />} active tooltip="Editor" />
        <NavItem icon={<FileText size={20} />} tooltip="Templates" />
        <NavItem icon={<Users size={20} />} tooltip="Users" />
        <NavItem
          icon={<BarChart2 size={20} />}
          tooltip="Analytics"
          onClick={() => postId && setShowAnalytics(true)}
          active={showAnalytics}
        />
        <NavItem icon={<CreditCard size={20} />} tooltip="Billing" />
      </div>

      {/* CENTER AREA: The Editor */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackClick}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Go back"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-medium">
                Post
              </span>
              <input
                type="text"
                value={templateData.title || ""}
                onChange={(e) =>
                  setTemplateData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="font-medium text-sm bg-transparent border-none outline-none focus:ring-0 w-auto"
                style={{
                  width: `${Math.max(
                    (templateData.title || "").length * 8,
                    120
                  )}px`,
                }}
                placeholder="Untitled Post"
              />
              <Edit3 size={12} className="text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Device Toggle */}
            <div className="flex bg-gray-100 rounded-md p-0.5 mr-4">
              <button
                onClick={() => setViewMode("desktop")}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${viewMode === "desktop"
                  ? "bg-white shadow-sm"
                  : "text-gray-500"
                  }`}
              >
                <Monitor size={12} /> Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${viewMode === "mobile" ? "bg-white shadow-sm" : "text-gray-500"
                  }`}
              >
                <Smartphone size={12} /> Mobile
              </button>
            </div>

            {/* Preview Button */}
            <button
              onClick={handlePreview}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded text-sm transition-all ${showPreview
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "border-gray-200 hover:bg-gray-50"
                }`}
            >
              <Eye size={14} /> {showPreview ? "Edit" : "Preview"}
            </button>

            {/* Settings Button */}
            {postId && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50"
              >
                <Settings size={14} />
              </button>
            )}

            {/* Save Dropdown */}
            <div className="relative">
              <div className="flex items-center">
                <button
                  onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-black disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save size={14} /> Save
                    </>
                  )}
                </button>
              </div>

              {showSaveDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px] z-50">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} /> Save Article
                  </button>
                  {onSaveDraft && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={isSaving}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save size={14} /> Save Draft
                    </button>
                  )}
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

            {/* Sidebar Toggle - Only show when sidebar is hidden */}
            {!showRightSidebar && (
              <button
                onClick={() => setShowRightSidebar(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Show sidebar"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
            )}
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

            {/* Font Picker Dropdown */}
            <button
              onClick={() => {
                setShowFontPicker(!showFontPicker);
                setShowFontSizePicker(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm font-medium ${showFontPicker ? "bg-gray-100 text-gray-900" : "text-gray-700"
                }`}
              title="Font Family - Select text and click to change font"
            >
              <span className="text-xs font-serif">Aa</span>
              <span className="text-xs">Font</span>
              <ChevronDown size={12} />
            </button>

            {/* Font Size Dropdown */}
            <button
              onClick={() => {
                setShowFontSizePicker(!showFontSizePicker);
                setShowFontPicker(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm font-medium ${showFontSizePicker ? "bg-gray-100 text-gray-900" : "text-gray-700"
                }`}
              title="Font Size - Select text and click to change size"
            >
              <Type size={14} />
              <span className="text-xs">Size</span>
              <ChevronDown size={12} />
            </button>

            {/* Clear All Formatting */}
            <ToolbarButton
              onClick={() => {
                editor.chain().focus().unsetAllMarks().run();
              }}
              title="Clear Formatting (remove all styles from selected text)"
            >
              <Eraser size={16} />
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

            {/* Quick Colors */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setColor("#000000").run()}
              title="Black Text"
            >
              <div className="w-4 h-4 rounded-full bg-black border border-gray-300" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setColor("#3B82F6").run()}
              title="Blue Text"
            >
              <div className="w-4 h-4 rounded-full bg-blue-500 border border-gray-300" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setColor("#EF4444").run()}
              title="Red Text"
            >
              <div className="w-4 h-4 rounded-full bg-red-500 border border-gray-300" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setColor("#16A34A").run()}
              title="Green Text"
            >
              <div className="w-4 h-4 rounded-full bg-green-600 border border-gray-300" />
            </ToolbarButton>
            {/* Color Picker */}
            <div className="relative">
              <ToolbarButton
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Custom Color"
              >
                <div
                  className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center"
                  style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
                >
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </ToolbarButton>
              {showColorPicker && (
                <div className="fixed inset-0 z-[9999]" onClick={() => setShowColorPicker(false)}>
                  <div
                    className="absolute"
                    style={{ top: "140px", left: "50%", transform: "translateX(-50%)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ColorPickerPopover
                      initialColor={customColor}
                      onColorChange={(color) => {
                        setCustomColor(color);
                        editor.chain().focus().setColor(color).run();
                      }}
                      onClose={() => setShowColorPicker(false)}
                    />
                  </div>
                </div>
              )}
            </div>

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
            <ToolbarButton
              onClick={() => insertBlock("line-full")}
              title="Insert Full-Width Divider"
            >
              <div className="w-4 border-b border-gray-600" />
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
              onClick={() => setShowImagePicker(true)}
              title="Add Image"
            >
              <ImageIcon size={16} />
            </ToolbarButton>

            {/* Video */}
            <ToolbarButton
              onClick={() => setShowVideoModal(true)}
              title="Add Video"
            >
              <Video size={16} />
            </ToolbarButton>

            {/* Button */}
            <ToolbarButton
              onClick={() => setShowButtonModal(true)}
              title="Add Button"
            >
              <span className="text-xs font-medium">+BUTTON</span>
            </ToolbarButton>

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

        {/* Font Picker Modal */}
        {showFontPicker && (
          <div className="fixed inset-0 z-[9999]" onClick={() => setShowFontPicker(false)}>
            <div
              className="absolute bg-white border border-gray-200 rounded-lg shadow-2xl w-64"
              style={{ top: "120px", left: "120px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3">
                <div className="text-xs text-gray-500 font-medium mb-2 px-1">Select Font</div>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {blogFonts.map((font) => (
                    <button
                      key={font.name}
                      onClick={() => {
                        if (!editor) return;
                        if (font.value === "inherit") {
                          // Reset font
                          editor.chain().focus().unsetFontFamily().run();
                        } else {
                          editor.chain().focus().setFontFamily(font.value).run();
                        }
                        setShowFontPicker(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors flex items-center gap-3"
                    >
                      <span
                        className="text-lg w-8"
                        style={{ fontFamily: font.value }}
                      >
                        {font.preview}
                      </span>
                      <span className="text-gray-700">{font.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Font Size Picker Modal */}
        {showFontSizePicker && (
          <div className="fixed inset-0 z-[9999]" onClick={() => setShowFontSizePicker(false)}>
            <div
              className="absolute bg-white border border-gray-200 rounded-lg shadow-2xl w-52"
              style={{ top: "120px", left: "200px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2">
                <div className="text-xs text-gray-500 font-medium mb-2 px-2">Text Size</div>
                {/* Clear Font Size */}
                <button
                  onClick={() => {
                    if (!editor) return;
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
                      onClick={() => {
                        if (!editor) return;
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
          </div>
        )}

        {/* Callout Color Picker */}
        {showCalloutPicker && editor && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowCalloutPicker(false)}
            />
            <div
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50"
              style={{
                top: "120px",
                right: "320px",
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
          <>
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
              {/* Font Picker */}
              <div className="relative">
                <BubbleButton
                  onClick={() => {
                    setShowBubbleFontPicker(!showBubbleFontPicker);
                    setShowBubbleSizePicker(false);
                  }}
                  active={showBubbleFontPicker}
                >
                  <span className="text-xs font-serif">Aa</span>
                </BubbleButton>
                {showBubbleFontPicker && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl w-48 max-h-64 overflow-y-auto z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      {blogFonts.map((font) => (
                        <button
                          key={font.name}
                          onClick={() => {
                            if (font.value === "inherit") {
                              editor.chain().focus().unsetFontFamily().run();
                            } else {
                              editor.chain().focus().setFontFamily(font.value).run();
                            }
                            setShowBubbleFontPicker(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
                        >
                          <span style={{ fontFamily: font.value }} className="text-base">Aa</span>
                          <span className="text-gray-700 text-xs">{font.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Size Picker */}
              <div className="relative">
                <BubbleButton
                  onClick={() => {
                    setShowBubbleSizePicker(!showBubbleSizePicker);
                    setShowBubbleFontPicker(false);
                  }}
                  active={showBubbleSizePicker}
                >
                  <Type size={12} />
                </BubbleButton>
                {showBubbleSizePicker && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl w-40 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      <button
                        onClick={() => {
                          editor.chain().focus().unsetFontSize().run();
                          setShowBubbleSizePicker(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 text-blue-600 font-medium rounded transition-colors mb-1"
                      >
                        Reset Default
                      </button>
                      <div className="grid grid-cols-4 gap-1">
                        {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              editor.chain().focus().setFontSize(`${size}px`).run();
                              setShowBubbleSizePicker(false);
                            }}
                            className="px-1 py-1 text-xs hover:bg-gray-100 rounded transition-colors text-center text-gray-700"
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                onClick={() => editor.chain().focus().setColor("#3B82F6").run()}
              >
                <div className="w-3 h-3 rounded-full bg-blue-500" />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().setColor("#EF4444").run()}
              >
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().setColor("#16A34A").run()}
              >
                <div className="w-3 h-3 rounded-full bg-green-600" />
              </BubbleButton>
              {/* Color Picker in Bubble Menu */}
              <BubbleButton
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
                />
              </BubbleButton>
            </BubbleMenu>
          </>
        )}

        {/* Analytics Drawer */}
        {postId && (
          <AnalyticsDrawer
            isOpen={showAnalytics}
            onClose={() => setShowAnalytics(false)}
            postId={postId}
          />
        )}

        {/* Post Settings Modal */}
        {postId && (
          <PostSettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            quizId={quizId}
            ratingEnabled={ratingEnabled}
            ctaEnabled={ctaEnabled}
            componentOrder={componentOrder}
            folderId={folderId}
            postSlug={postSlug}
            nextPostId={nextPostId}
            currentPostId={postId}
            quizShowResponsesPreview={quizShowResponsesPreview}
            quizSkipContactCollection={quizSkipContactCollection}
            quizShowDescription={quizShowDescription}
            quizShowResponsesButton={quizShowResponsesButton}
            onSave={(
              newQuizId,
              newRatingEnabled,
              newCtaEnabled,
              newComponentOrder,
              newFolderId,
              newPostSlug,
              newNextPostId,
              newQuizShowResponsesPreview,
              newQuizSkipContactCollection,
              newQuizShowDescription,
              newQuizShowResponsesButton
            ) => {
              // Update local state first
              const quizChanged = newQuizId !== quizId;
              const ratingChanged = newRatingEnabled !== ratingEnabled;
              const ctaChanged = newCtaEnabled !== ctaEnabled;
              const orderChanged = JSON.stringify(newComponentOrder) !== JSON.stringify(componentOrder);
              const folderChanged = newFolderId !== folderId;
              const slugChanged = newPostSlug !== postSlug;
              const nextPostChanged = newNextPostId !== nextPostId;
              const responsesPreviewChanged = newQuizShowResponsesPreview !== quizShowResponsesPreview;
              const skipContactChanged = newQuizSkipContactCollection !== quizSkipContactCollection;
              const showDescriptionChanged = newQuizShowDescription !== quizShowDescription;
              const showResponsesButtonChanged = newQuizShowResponsesButton !== quizShowResponsesButton;

              setQuizId(newQuizId);
              setRatingEnabled(newRatingEnabled);
              setCtaEnabled(newCtaEnabled);
              setComponentOrder(newComponentOrder);
              setFolderId(newFolderId);
              setPostSlug(newPostSlug);
              setNextPostId(newNextPostId);
              setQuizShowResponsesPreview(newQuizShowResponsesPreview);
              setQuizSkipContactCollection(newQuizSkipContactCollection);
              setQuizShowDescription(newQuizShowDescription);
              setQuizShowResponsesButton(newQuizShowResponsesButton);

              // Only trigger updates if changed
              if (quizChanged && onUpdateQuizId) {
                onUpdateQuizId(newQuizId);
              }
              if (ratingChanged && onUpdateRatingEnabled) {
                onUpdateRatingEnabled(newRatingEnabled);
              }
              if (ctaChanged && onUpdateCtaEnabled) {
                onUpdateCtaEnabled(newCtaEnabled);
              }
              if (orderChanged && onUpdateComponentOrder) {
                onUpdateComponentOrder(newComponentOrder);
              }
              if (folderChanged && onUpdateFolderId) {
                onUpdateFolderId(newFolderId);
              }
              if (slugChanged && onUpdatePostSlug) {
                onUpdatePostSlug(newPostSlug);
              }
              if (nextPostChanged && onUpdateNextPostId) {
                onUpdateNextPostId(newNextPostId);
              }
              if (responsesPreviewChanged && onUpdateQuizShowResponsesPreview) {
                onUpdateQuizShowResponsesPreview(newQuizShowResponsesPreview);
              }
              if (skipContactChanged && onUpdateQuizSkipContactCollection) {
                onUpdateQuizSkipContactCollection(newQuizSkipContactCollection);
              }
              if (showDescriptionChanged && onUpdateQuizShowDescription) {
                onUpdateQuizShowDescription(newQuizShowDescription);
              }
              if (showResponsesButtonChanged && onUpdateQuizShowResponsesButton) {
                onUpdateQuizShowResponsesButton(newQuizShowResponsesButton);
              }
            }}
          />
        )}

        {/* Scrollable Canvas Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 flex justify-center bg-[#F9FAFB]">
          <div
            className={`bg-white shadow-sm min-h-[1000px] relative transition-all duration-300 overflow-x-hidden ${viewMode === "mobile"
              ? "w-[430px] mobile-preview"
              : "w-full max-w-[800px]"
              }`}
            style={{
              ...editorStyles,
              backgroundColor: templateData.useGreenTemplate ? "#10B981" : styles.backgroundColor,
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
                className={`absolute top-16 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 shadow-sm transition-all ${viewMode === "mobile" ? "-left-10" : "-left-12"
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
              {/* Template Header (React inputs, not part of TipTap) */}
              {templateData.headerEnabled !== false && (
                <div className={`mb-10 ${templateData.useGreenTemplate ? "text-white" : ""}`}>
                  {showPreview ? (
                    <div>
                      <div
                        className={`${templateData.alignment === "center"
                          ? "text-center"
                          : templateData.alignment === "right"
                            ? "text-right"
                            : "text-left"
                          } tracking-[0.18em] uppercase mb-4`}
                        style={{
                          fontFamily: templateData.seriesFont
                            ? fontOptions.find(
                              (f) => f.name === templateData.seriesFont
                            )?.value || templateData.seriesFont
                            : undefined,
                          fontWeight: templateData.seriesWeight || "700",
                          fontSize: templateData.seriesSize || "0.75rem",
                          color: templateData.seriesColor || undefined,
                          opacity: templateData.seriesColor ? 1 : 0.8,
                        }}
                      >
                        {(templateData.seriesName || "").trim()}
                        {(templateData.seriesName || "").trim() &&
                          (templateData.volume || "").trim()
                          ? " • "
                          : ""}
                        {(templateData.volume || "").trim() || ""}
                      </div>
                      <h1
                        className={`${templateData.alignment === "center"
                          ? "text-center"
                          : templateData.alignment === "right"
                            ? "text-right"
                            : "text-left"
                          } mb-4`}
                        style={{
                          fontFamily: templateData.titleFont
                            ? fontOptions.find(
                              (f) => f.name === templateData.titleFont
                            )?.value || templateData.titleFont
                            : fontOptions.find(
                              (f) => f.name === styles.headingFont
                            )?.value || styles.headingFont,
                          fontWeight:
                            templateData.titleWeight || styles.headingWeight,
                          fontSize: templateData.titleSize || "3rem",
                          color: templateData.titleColor || undefined,
                        }}
                      >
                        {(templateData.title || "").trim() || "Untitled Post"}
                      </h1>
                      {(templateData.subtitle || "").trim() ? (
                        <p
                          className={`${templateData.alignment === "center"
                            ? "text-center"
                            : templateData.alignment === "right"
                              ? "text-right"
                              : "text-left"
                            } italic mb-6`}
                          style={{
                            fontFamily: templateData.subtitleFont
                              ? fontOptions.find(
                                (f) => f.name === templateData.subtitleFont
                              )?.value || templateData.subtitleFont
                              : undefined,
                            fontWeight:
                              templateData.subtitleWeight || undefined,
                            fontSize: templateData.subtitleSize || "1.25rem",
                            color: templateData.subtitleColor || undefined,
                            opacity: templateData.subtitleColor ? 1 : 0.9,
                          }}
                        >
                          {templateData.subtitle}
                        </p>
                      ) : null}
                      <div
                        className={`${templateData.alignment === "center"
                          ? "text-center"
                          : templateData.alignment === "right"
                            ? "text-right"
                            : "text-left"
                          } tracking-[0.14em] uppercase border-b pb-4`}
                        style={{
                          fontFamily: templateData.bylineFont
                            ? fontOptions.find(
                              (f) => f.name === templateData.bylineFont
                            )?.value || templateData.bylineFont
                            : undefined,
                          fontWeight: templateData.bylineWeight || "700",
                          fontSize: templateData.bylineSize || "0.75rem",
                          color: templateData.bylineColor || undefined,
                          opacity: templateData.bylineColor ? 1 : 0.8,
                        }}
                      >
                        {(templateData.authorName || "").trim()
                          ? `By ${templateData.authorName}`
                          : ""}
                        {(templateData.authorName || "").trim() &&
                          (templateData.date || "").trim()
                          ? " • "
                          : ""}
                        {(templateData.date || "").trim() || ""}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        className={`flex items-center ${templateData.alignment === "center"
                          ? "justify-center"
                          : templateData.alignment === "right"
                            ? "justify-end"
                            : "justify-start"
                          } gap-2 tracking-[0.18em] uppercase mb-4`}
                      >
                        <input
                          type="text"
                          value={templateData.seriesName || ""}
                          onChange={(e) =>
                            setTemplateData((prev) => ({
                              ...prev,
                              seriesName: e.target.value,
                            }))
                          }
                          className="bg-transparent border-b border-transparent focus:border-gray-300 outline-none px-1"
                          style={{
                            width: `${Math.max(
                              (templateData.seriesName || "").length * 9,
                              160
                            )}px`,
                            fontFamily: templateData.seriesFont
                              ? fontOptions.find(
                                (f) => f.name === templateData.seriesFont
                              )?.value || templateData.seriesFont
                              : undefined,
                            fontWeight: templateData.seriesWeight || "700",
                            fontSize: templateData.seriesSize || "0.75rem",
                            color: templateData.seriesColor || undefined,
                            textAlign:
                              templateData.alignment === "center"
                                ? "center"
                                : templateData.alignment === "right"
                                  ? "right"
                                  : "left",
                          }}
                          placeholder="The Editorial Review"
                        />
                        <span style={{ opacity: 0.7 }}>•</span>
                        <input
                          type="text"
                          value={templateData.volume || ""}
                          onChange={(e) => {
                            setTemplateData((prev) => ({
                              ...prev,
                              volume: e.target.value,
                            }));
                          }}
                          className="bg-transparent border-b border-transparent focus:border-gray-300 outline-none px-1"
                          style={{
                            width: `${Math.max(
                              (templateData.volume || "").length * 10,
                              120
                            )}px`,
                            fontFamily: templateData.seriesFont
                              ? fontOptions.find(
                                (f) => f.name === templateData.seriesFont
                              )?.value || templateData.seriesFont
                              : undefined,
                            fontWeight: templateData.seriesWeight || "700",
                            fontSize: templateData.seriesSize || "0.75rem",
                            color: templateData.seriesColor || undefined,
                            textAlign:
                              templateData.alignment === "center"
                                ? "center"
                                : templateData.alignment === "right"
                                  ? "right"
                                  : "left",
                          }}
                          placeholder="Volume XXIII"
                        />
                      </div>

                      <textarea
                        ref={titleTextareaRef}
                        value={templateData.title || ""}
                        onChange={(e) =>
                          setTemplateData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className={`w-full bg-transparent outline-none border-none focus:ring-0 mb-4 resize-none overflow-hidden`}
                        placeholder="Untitled Post"
                        rows={1}
                        style={{
                          fontFamily: templateData.titleFont
                            ? fontOptions.find(
                              (f) => f.name === templateData.titleFont
                            )?.value || templateData.titleFont
                            : fontOptions.find(
                              (f) => f.name === styles.headingFont
                            )?.value || styles.headingFont,
                          fontWeight:
                            templateData.titleWeight || styles.headingWeight,
                          fontSize: templateData.titleSize || "3rem",
                          color: templateData.titleColor || undefined,
                          textAlign:
                            templateData.alignment === "center"
                              ? "center"
                              : templateData.alignment === "right"
                                ? "right"
                                : "left",
                          lineHeight: "1.2",
                          minHeight: "1.2em",
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />

                      <textarea
                        ref={subtitleTextareaRef}
                        value={templateData.subtitle || ""}
                        onChange={(e) =>
                          setTemplateData((prev) => ({
                            ...prev,
                            subtitle: e.target.value,
                          }))
                        }
                        className={`w-full italic bg-transparent outline-none border-none focus:ring-0 mb-6 resize-none overflow-hidden`}
                        placeholder="A subtitle for your article"
                        rows={1}
                        style={{
                          fontFamily: templateData.subtitleFont
                            ? fontOptions.find(
                              (f) => f.name === templateData.subtitleFont
                            )?.value || templateData.subtitleFont
                            : undefined,
                          fontWeight: templateData.subtitleWeight || undefined,
                          fontSize: templateData.subtitleSize || "1.25rem",
                          color: templateData.subtitleColor || undefined,
                          opacity: templateData.subtitleColor ? 1 : 0.95,
                          textAlign:
                            templateData.alignment === "center"
                              ? "center"
                              : templateData.alignment === "right"
                                ? "right"
                                : "left",
                          lineHeight: "1.4",
                          minHeight: "1.4em",
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />

                      <div
                        className={`flex items-center ${templateData.alignment === "center"
                          ? "justify-center"
                          : templateData.alignment === "right"
                            ? "justify-end"
                            : "justify-start"
                          } gap-2 tracking-[0.14em] uppercase border-b pb-4`}
                      >
                        <input
                          type="text"
                          value={
                            templateData.authorName
                              ? `By ${templateData.authorName}`
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            // Extract author name from "By Author Name" format or just use the value
                            const authorMatch = value.match(/^By\s+(.+)$/i);
                            const newAuthorName = authorMatch
                              ? authorMatch[1].trim()
                              : value.replace(/^By\s*/i, "").trim();
                            setTemplateData((prev) => ({
                              ...prev,
                              authorName: newAuthorName,
                            }));
                          }}
                          className="bg-transparent border-b border-transparent focus:border-gray-300 outline-none px-1"
                          style={{
                            width: `${Math.max(
                              (templateData.authorName
                                ? `By ${templateData.authorName}`
                                : ""
                              ).length * 8,
                              140
                            )}px`,
                            fontFamily: templateData.bylineFont
                              ? fontOptions.find(
                                (f) => f.name === templateData.bylineFont
                              )?.value || templateData.bylineFont
                              : undefined,
                            fontWeight: templateData.bylineWeight || "700",
                            fontSize: templateData.bylineSize || "0.75rem",
                            color: templateData.bylineColor || undefined,
                            textAlign:
                              templateData.alignment === "center"
                                ? "center"
                                : templateData.alignment === "right"
                                  ? "right"
                                  : "left",
                          }}
                          placeholder="By Author Name"
                        />
                        <span style={{ opacity: 0.7 }}>•</span>
                        <input
                          type="text"
                          value={templateData.date || ""}
                          onChange={(e) =>
                            setTemplateData((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                          className="bg-transparent border-b border-transparent focus:border-gray-300 outline-none px-1"
                          style={{
                            width: `${Math.max(
                              (templateData.date || "").length * 8,
                              160
                            )}px`,
                            fontFamily: templateData.bylineFont
                              ? fontOptions.find(
                                (f) => f.name === templateData.bylineFont
                              )?.value || templateData.bylineFont
                              : undefined,
                            fontWeight: templateData.bylineWeight || "700",
                            fontSize: templateData.bylineSize || "0.75rem",
                            color: templateData.bylineColor || undefined,
                            textAlign:
                              templateData.alignment === "center"
                                ? "center"
                                : templateData.alignment === "right"
                                  ? "right"
                                  : "left",
                          }}
                          placeholder={new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Content Area - Wrapped in white card when green template is active */}
              <div className={templateData.useGreenTemplate ? "bg-white rounded-lg p-8 shadow-lg" : ""}>
                {showPreview ? (
                  <>
                    <div
                      className="preview-content prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: editor?.getHTML() || "",
                      }}
                      style={{
                        fontFamily: fontOptions.find(
                          (f) => f.name === styles.bodyFont
                        )?.value,
                        color: templateData.useGreenTemplate ? "#000000" : undefined,
                      }}
                    />
                    {/* Divider before components - only show if there are components */}
                    {(quizId ||
                      (ratingEnabled && postId) ||
                      (ctaEnabled && postId)) && (
                        <div className="border-t border-gray-200 mt-12"></div>
                      )}
                    {/* Render components in the specified order */}
                    {componentOrder.map((componentType) => {
                      if (componentType === "quiz" && quizId) {
                        return (
                          <QuizRenderer
                            key={`quiz-${quizId}`}
                            quizId={quizId}
                            skipInlineScan={true}
                            showResponsesPreview={quizShowResponsesPreview}
                            skipContactCollection={quizSkipContactCollection}
                            showDescription={quizShowDescription}
                            showResponsesButton={quizShowResponsesButton}
                          />
                        );
                      }
                      if (componentType === "rating" && ratingEnabled && postId) {
                        return (
                          <ReactionBar key={`rating-${postId}`} postId={postId} />
                        );
                      }
                      if (componentType === "cta" && ctaEnabled && postId) {
                        return (
                          <CTAForm
                            key={`cta-${postId}`}
                            postId={postId}
                            quizId={quizId}
                          />
                        );
                      }
                      return null;
                    })}
                  </>
                ) : (
                  <>
                    <EditorContent editor={editor} className="editorial-editor" />
                    {/* Divider before components - only show if there are components */}
                    {(quizId ||
                      (ratingEnabled && postId) ||
                      (ctaEnabled && postId)) && (
                        <div className="border-t border-gray-200 mt-12"></div>
                      )}
                    {/* Render components in the specified order - Non-editable preview */}
                    {componentOrder.map((componentType) => {
                      if (componentType === "quiz" && quizId) {
                        return (
                          <div
                            className="mt-8 pointer-events-none opacity-75"
                            key={`quiz-preview-${quizId}`}
                          >
                            <QuizRenderer
                              quizId={quizId}
                              skipInlineScan={true}
                              showResponsesPreview={quizShowResponsesPreview}
                              skipContactCollection={quizSkipContactCollection}
                              showDescription={quizShowDescription}
                              showResponsesButton={quizShowResponsesButton}
                            />
                          </div>
                        );
                      }
                      if (componentType === "rating" && ratingEnabled && postId) {
                        return (
                          <div
                            className="mt-8 pointer-events-none opacity-75"
                            key={`rating-preview-${postId}`}
                          >
                            <ReactionBar postId={postId} />
                          </div>
                        );
                      }
                      if (componentType === "cta" && ctaEnabled && postId) {
                        return (
                          <div
                            className="mt-8 pointer-events-none opacity-75"
                            key={`cta-preview-${postId}`}
                          >
                            <CTAForm postId={postId} quizId={quizId} />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* RIGHT SIDEBAR: Properties */}
      {showRightSidebar && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
          {/* Sidebar Header with Close Button on Left */}
          <div className="p-3 border-b border-gray-100 flex items-center gap-2">
            <button
              onClick={() => setShowRightSidebar(false)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              title="Hide sidebar"
            >
              <ChevronRight size={16} className="text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-700">Properties</span>
          </div>
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
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${mode === "Basic" ? "bg-white shadow-sm" : "text-gray-500"
                  }`}
              >
                Basic
              </button>
              <button
                onClick={() => setMode("Advanced")}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${mode === "Advanced" ? "bg-white shadow-sm" : "text-gray-500"
                  }`}
              >
                Advanced
              </button>
            </div>
          </div>

          {/* Controls Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Video Options - Show when video is selected */}
            {selectedVideo && !showPreview && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader title="Video Settings" />
                  <button
                    onClick={handleDeleteVideo}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>

                {/* Video Title */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Video Title
                  </label>
                  <input
                    type="text"
                    value={selectedVideo.title || ""}
                    onChange={(e) =>
                      handleVideoSettingChange("title", e.target.value)
                    }
                    placeholder="Video Title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  />
                </div>

                {/* Video Alignment */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Alignment
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVideoAlignChange("left")}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${selectedVideo.align === "left"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      Left
                    </button>
                    <button
                      onClick={() => handleVideoAlignChange("center")}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${selectedVideo.align === "center"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      Center
                    </button>
                    <button
                      onClick={() => handleVideoAlignChange("right")}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${selectedVideo.align === "right"
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      Right
                    </button>
                  </div>
                </div>

                {/* Video Theme Color */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Player Theme Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={selectedVideo.primaryColor || "#F48120"}
                      onChange={(e) => handleVideoThemeChange(e.target.value)}
                      className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedVideo.primaryColor || "#F48120"}
                      onChange={(e) => handleVideoThemeChange(e.target.value)}
                      placeholder="#F48120"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm font-mono"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Customize the seekbar and play button color
                  </p>
                </div>

                {/* Display Options */}
                <div className="mb-6 space-y-3">
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Display Options
                  </label>

                  {/* Autoplay Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Autoplay</span>
                    <button
                      onClick={() =>
                        handleVideoSettingChange(
                          "autoplay",
                          !selectedVideo.autoplay
                        )
                      }
                      className={`relative w-11 h-6 rounded-full transition-colors ${selectedVideo.autoplay ? "bg-indigo-600" : "bg-gray-200"
                        }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${selectedVideo.autoplay
                          ? "translate-x-5"
                          : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>

                  {/* Show Duration Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Show Duration</span>
                    <button
                      onClick={() =>
                        handleVideoSettingChange(
                          "showDuration",
                          !selectedVideo.showDuration
                        )
                      }
                      className={`relative w-11 h-6 rounded-full transition-colors ${selectedVideo.showDuration
                        ? "bg-indigo-600"
                        : "bg-gray-200"
                        }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${selectedVideo.showDuration
                          ? "translate-x-5"
                          : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>

                  {/* Show Background Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      Show Background
                    </span>
                    <button
                      onClick={() =>
                        handleVideoSettingChange(
                          "showBackground",
                          !selectedVideo.showBackground
                        )
                      }
                      className={`relative w-11 h-6 rounded-full transition-colors ${selectedVideo.showBackground
                        ? "bg-indigo-600"
                        : "bg-gray-200"
                        }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${selectedVideo.showBackground
                          ? "translate-x-5"
                          : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Timestamps Button */}
                <button
                  onClick={() => {
                    setSelectedVideoId(selectedVideo.videoId);
                    setShowVideoTimestampModal(true);
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  Manage Timestamps
                </button>
              </div>
            )}

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

            {/* Template Settings Section */}
            {!showPreview && (
              <div className="mb-6 border-t border-gray-100 pt-4">
                <SectionHeader title="Template Settings" />

                {/* Show Header Toggle */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Show Header</label>
                    <button
                      onClick={() =>
                        setTemplateData((prev) => ({
                          ...prev,
                          headerEnabled: !prev.headerEnabled,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${templateData.headerEnabled !== false
                        ? "bg-indigo-600"
                        : "bg-gray-200"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${templateData.headerEnabled !== false
                          ? "translate-x-6"
                          : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Toggle the editorial header (series, title, byline)
                  </p>
                </div>

                {/* Green Template Mode Toggle */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Green Template</label>
                    <button
                      onClick={() =>
                        setTemplateData((prev) => ({
                          ...prev,
                          useGreenTemplate: !prev.useGreenTemplate,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${templateData.useGreenTemplate
                        ? "bg-green-600"
                        : "bg-gray-200"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${templateData.useGreenTemplate
                          ? "translate-x-6"
                          : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Display with green background and white content card
                  </p>
                </div>

                {/* Template Alignment - only show if header is enabled */}
                {templateData.headerEnabled !== false && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Alignment
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setTemplateData((prev) => ({
                            ...prev,
                            alignment: "left",
                          }))
                        }
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${(templateData.alignment || "left") === "left"
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        Left
                      </button>
                      <button
                        onClick={() =>
                          setTemplateData((prev) => ({
                            ...prev,
                            alignment: "center",
                          }))
                        }
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${templateData.alignment === "center"
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        Center
                      </button>
                      <button
                        onClick={() =>
                          setTemplateData((prev) => ({
                            ...prev,
                            alignment: "right",
                          }))
                        }
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${templateData.alignment === "right"
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        Right
                      </button>
                    </div>
                  </div>
                )}

                {/* Template Typography Controls - only show if header is enabled */}
                {templateData.headerEnabled !== false && (
                  <TemplateTypographyControls
                    templateData={templateData}
                    setTemplateData={setTemplateData}
                  />
                )}
              </div>
            )}

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
      )}

      {/* Close save dropdown when clicking outside */}
      {showSaveDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSaveDropdown(false)}
        />
      )}

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
              <BlockMenuItem
                icon={<div className="w-6 border-b border-gray-400" />}
                label="Full Line"
                onClick={() => insertBlock("line-full")}
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
          setShowImageHistory(true);
        }}
      />

      {/* Image History Modal */}
      <ImageHistoryModal
        isOpen={showImageHistory}
        onClose={() => setShowImageHistory(false)}
        onSelectImage={handleSelectFromHistory}
      />

      {/* AI Image Generator Modal */}
      <AIImageGeneratorModal
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onUseImage={handleUseGeneratedImage}
      />

      {/* Web Image Attribution Modal */}
      <ImageAttributionModal
        isOpen={showWebImageModal}
        onClose={() => setShowWebImageModal(false)}
        onInsert={handleInsertWebImage}
      />

      {/* Video Modal */}
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onInsert={handleInsertVideo}
      />

      {/* Video Timestamp Modal */}
      <VideoTimestampModal
        isOpen={showVideoTimestampModal}
        onClose={() => {
          setShowVideoTimestampModal(false);
          setSelectedVideoId("");
        }}
        videoId={selectedVideo?.videoId || selectedVideoId}
        videoUrl={
          selectedVideo
            ? buildCloudflareEmbedUrl(
              selectedVideo.videoId,
              selectedVideo.customerCode,
              selectedVideo.primaryColor
            )
            : undefined
        }
        customerCode={selectedVideo?.customerCode}
        primaryColor={selectedVideo?.primaryColor}
        postId={postId}
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

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedChangesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unsaved Changes
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                You have unsaved changes. What would you like to do?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleDiscardAndGoBack}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSaveDraftAndGoBack}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-black transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Draft & Go Back"}
                </button>
                <button
                  onClick={() => setShowUnsavedChangesModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
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
    className={`p-2 rounded transition-colors ${active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
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
    className={`p-1.5 rounded text-sm font-medium transition-colors ${active ? "bg-white text-gray-900" : "text-gray-300 hover:text-white"
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
    className={`p-2 rounded-lg transition-colors relative group ${active
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
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${value === font.name ? "bg-indigo-50 text-indigo-700" : ""
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
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${value === weight.value ? "bg-indigo-50 text-indigo-700" : ""
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

interface TypographySectionProps {
  title: string;
  prefix: string;
  fontField: keyof PostTemplateData;
  weightField: keyof PostTemplateData;
  sizeField: keyof PostTemplateData;
  colorField: keyof PostTemplateData;
  templateData: PostTemplateData;
  expandedSection: string | null;
  setExpandedSection: (section: string | null) => void;
  updateTypography: (field: string, value: string) => void;
}

const TypographySection = ({
  title,
  prefix,
  fontField,
  weightField,
  sizeField,
  colorField,
  templateData,
  expandedSection,
  setExpandedSection,
  updateTypography,
}: TypographySectionProps) => {
  const isExpanded = expandedSection === prefix;
  const fontValue = (templateData[fontField] as string) || "";
  const weightValue = (templateData[weightField] as string) || "";
  const sizeValue = (templateData[sizeField] as string) || "";
  const colorValue = (templateData[colorField] as string) || "";

  return (
    <div className="border border-gray-200 rounded-lg mb-2">
      <button
        onClick={() => setExpandedSection(isExpanded ? null : prefix)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-gray-50 transition-colors rounded-lg"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""
            }`}
        />
      </button>
      {isExpanded && (
        <div className="p-3 pt-2 space-y-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Font</span>
            <FontSelect
              value={fontValue || fontOptions[0].name}
              onChange={(v) => updateTypography(fontField as string, v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Weight</span>
            <WeightSelect
              value={weightValue || "400"}
              onChange={(v) => updateTypography(weightField as string, v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Size</span>
            <input
              type="text"
              value={sizeValue}
              onChange={(e) =>
                updateTypography(sizeField as string, e.target.value)
              }
              placeholder="e.g., 0.75rem, 12px"
              className="w-32 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorValue || "#000000"}
                onChange={(e) =>
                  updateTypography(colorField as string, e.target.value)
                }
                className="w-10 h-8 border border-gray-200 rounded cursor-pointer"
              />
              <input
                type="text"
                value={colorValue || "#000000"}
                onChange={(e) =>
                  updateTypography(colorField as string, e.target.value)
                }
                placeholder="#000000"
                className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TemplateTypographyControls = ({
  templateData,
  setTemplateData,
}: {
  templateData: PostTemplateData;
  setTemplateData: React.Dispatch<React.SetStateAction<PostTemplateData>>;
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const updateTypography = (field: string, value: string) => {
    setTemplateData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Typography
        </span>
        <button
          onClick={() => {
            // Reset all typography to defaults
            setTemplateData((prev) => ({
              ...prev,
              seriesFont: undefined,
              seriesWeight: undefined,
              seriesSize: undefined,
              seriesColor: undefined,
              titleFont: undefined,
              titleWeight: undefined,
              titleSize: undefined,
              titleColor: undefined,
              subtitleFont: undefined,
              subtitleWeight: undefined,
              subtitleSize: undefined,
              subtitleColor: undefined,
              bylineFont: undefined,
              bylineWeight: undefined,
              bylineSize: undefined,
              bylineColor: undefined,
            }));
          }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Reset
        </button>
      </div>
      <div className="space-y-2">
        <TypographySection
          title="Series & Volume"
          prefix="series"
          fontField="seriesFont"
          weightField="seriesWeight"
          sizeField="seriesSize"
          colorField="seriesColor"
          templateData={templateData}
          expandedSection={expandedSection}
          setExpandedSection={setExpandedSection}
          updateTypography={updateTypography}
        />
        <TypographySection
          title="Title"
          prefix="title"
          fontField="titleFont"
          weightField="titleWeight"
          sizeField="titleSize"
          colorField="titleColor"
          templateData={templateData}
          expandedSection={expandedSection}
          setExpandedSection={setExpandedSection}
          updateTypography={updateTypography}
        />
        <TypographySection
          title="Subtitle"
          prefix="subtitle"
          fontField="subtitleFont"
          weightField="subtitleWeight"
          sizeField="subtitleSize"
          colorField="subtitleColor"
          templateData={templateData}
          expandedSection={expandedSection}
          setExpandedSection={setExpandedSection}
          updateTypography={updateTypography}
        />
        <TypographySection
          title="Byline (Author & Date)"
          prefix="byline"
          fontField="bylineFont"
          weightField="bylineWeight"
          sizeField="bylineSize"
          colorField="bylineColor"
          templateData={templateData}
          expandedSection={expandedSection}
          setExpandedSection={setExpandedSection}
          updateTypography={updateTypography}
        />
      </div>
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
