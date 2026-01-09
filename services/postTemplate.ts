/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Post Template Service
 * Generates and manages the required template structure for posts
 */

export interface PostTemplateData {
  headerEnabled?: boolean; // Whether to show the template header
  useGreenTemplate?: boolean; // Whether to use green template with white content card
  seriesName?: string;
  volume?: string;
  title?: string;
  subtitle?: string;
  authorName?: string;
  date?: string;
  alignment?: "left" | "center" | "right";
  // Typography options
  seriesFont?: string;
  seriesWeight?: string;
  seriesSize?: string;
  seriesColor?: string;
  titleFont?: string;
  titleWeight?: string;
  titleSize?: string;
  titleColor?: string;
  subtitleFont?: string;
  subtitleWeight?: string;
  subtitleSize?: string;
  subtitleColor?: string;
  bylineFont?: string;
  bylineWeight?: string;
  bylineSize?: string;
  bylineColor?: string;
}

export function getDefaultTemplateData(createdDate?: string): PostTemplateData {
  const dateStr = createdDate
    ? new Date(createdDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  return {
    headerEnabled: true,
    seriesName: "The Editorial Review",
    volume: "XXIII",
    title: "Untitled Article",
    subtitle: "A subtitle for your article",
    authorName: "Author Name",
    date: dateStr,
    alignment: "left",
  };
}

export function normalizeTemplateData(
  data?: PostTemplateData | null,
  createdDate?: string
): PostTemplateData {
  const defaults = getDefaultTemplateData(createdDate);
  return {
    ...defaults,
    ...(data || {}),
    // Ensure we always have a usable date
    date: data?.date || defaults.date,
    // Preserve headerEnabled if explicitly set to false
    headerEnabled:
      data?.headerEnabled !== undefined
        ? data.headerEnabled
        : defaults.headerEnabled,
  };
}

export function stripTemplateFromHtml(html: string): string {
  if (!html) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const selectors = [
      'p[data-template-type="series"]',
      'h1[data-template-type="title"]',
      'p[data-template-type="subtitle"]',
      'p[data-template-type="byline"]',
    ];

    selectors.forEach((sel) => {
      const el = doc.querySelector(sel);
      if (el) el.remove();
    });

    return doc.body.innerHTML || "";
  } catch {
    return html;
  }
}

export function splitTemplateFromHtml(
  html: string,
  createdDate?: string
): { template: PostTemplateData; body: string } {
  const extracted = extractTemplateData(html);
  const hasAny =
    Boolean(extracted.seriesName) ||
    Boolean(extracted.volume) ||
    Boolean(extracted.title) ||
    Boolean(extracted.subtitle) ||
    Boolean(extracted.authorName) ||
    Boolean(extracted.date);

  const template = normalizeTemplateData(
    hasAny ? extracted : null,
    createdDate
  );
  const body = hasAny ? stripTemplateFromHtml(html) : html;

  return { template, body };
}

/**
 * Generate the default post template as TipTap JSON
 * @param data - Template data (optional, uses defaults if not provided)
 * @param createdDate - Created date for existing posts (optional)
 * @returns TipTap JSON structure
 */
export function generatePostTemplate(
  data?: PostTemplateData,
  createdDate?: string
): any {
  const seriesName = data?.seriesName || "The Editorial Review";
  const volume = data?.volume || "XXIII";
  const title = data?.title || "Untitled Article";
  const subtitle = data?.subtitle || "A subtitle for your article";
  const authorName = data?.authorName || "Author Name";

  // Use provided date, created date, or current date
  let dateStr: string;
  if (data?.date) {
    dateStr = data.date;
  } else if (createdDate) {
    dateStr = new Date(createdDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } else {
    dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Generate TipTap JSON structure
  return {
    type: "doc",
    content: [
      {
        type: "templateSeries",
        attrs: {
          seriesName,
          volume,
        },
      },
      {
        type: "templateTitle",
        attrs: {
          title,
        },
      },
      {
        type: "templateSubtitle",
        attrs: {
          subtitle,
        },
      },
      {
        type: "templateByline",
        attrs: {
          authorName,
          date: dateStr,
        },
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Start writing your article here...",
          },
        ],
      },
    ],
  };
}

/**
 * Extract template data from HTML content
 * @param html - HTML content string
 * @returns Extracted template data
 */
export function extractTemplateData(html: string): PostTemplateData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const seriesEl = doc.querySelector('[data-template-type="series"]');
  const titleEl = doc.querySelector('[data-template-type="title"]');
  const subtitleEl = doc.querySelector('[data-template-type="subtitle"]');
  const bylineEl = doc.querySelector('[data-template-type="byline"]');

  let seriesName = "";
  let volume = "";
  if (seriesEl) {
    const seriesNameAttr = seriesEl.getAttribute("data-series-name");
    const volumeAttr = seriesEl.getAttribute("data-volume");
    if (seriesNameAttr) seriesName = seriesNameAttr.trim();
    if (volumeAttr) volume = volumeAttr.trim();

    if (!seriesName || !volume) {
      const text = seriesEl.textContent || "";
      const match = text.match(/^(.+?)\s*•\s*Volume\s+(.+)$/);
      if (match) {
        seriesName = seriesName || match[1].trim();
        volume = volume || match[2].trim();
      }
    }
  }

  const title =
    titleEl?.getAttribute("data-title")?.trim() ||
    titleEl?.textContent?.trim() ||
    "";
  const subtitle =
    subtitleEl?.getAttribute("data-subtitle")?.trim() ||
    subtitleEl?.textContent?.trim() ||
    "";

  let authorName = "";
  let date = "";
  if (bylineEl) {
    const authorAttr = bylineEl.getAttribute("data-author-name");
    const dateAttr = bylineEl.getAttribute("data-date");
    if (authorAttr) authorName = authorAttr.trim();
    if (dateAttr) date = dateAttr.trim();

    if (!authorName || !date) {
      const text = bylineEl.textContent || "";
      const match = text.match(/^By\s+(.+?)\s*•\s*(.+)$/);
      if (match) {
        authorName = authorName || match[1].trim();
        date = date || match[2].trim();
      }
    }
  }

  return {
    seriesName,
    volume,
    title,
    subtitle,
    authorName,
    date,
  };
}

/**
 * Check if content has the required template structure
 * @param content - HTML content string or TipTap JSON
 * @returns true if all required elements exist
 */
export function hasTemplateStructure(content: string | any): boolean {
  // Check if it's a TipTap JSON structure
  if (typeof content === "object" && content !== null) {
    if (content.type === "doc" && Array.isArray(content.content)) {
      const nodeTypes = content.content.map((node: any) => node.type);
      return [
        "templateSeries",
        "templateTitle",
        "templateSubtitle",
        "templateByline",
      ].every((type) => nodeTypes.includes(type));
    }
  }

  // Check HTML string
  if (typeof content === "string") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const requiredTypes = ["series", "title", "subtitle", "byline"];
    return requiredTypes.every((type) => {
      return doc.querySelector(`[data-template-type="${type}"]`) !== null;
    });
  }

  return false;
}

/**
 * Ensure template structure exists in content, add if missing
 * @param content - HTML content string or TipTap JSON
 * @param createdDate - Created date for existing posts
 * @returns Content with guaranteed template structure (same format as input)
 */
export function ensureTemplateStructure(
  content: string | any,
  createdDate?: string
): string | any {
  if (hasTemplateStructure(content)) {
    return content;
  }

  // Extract existing data if possible
  let existingData: PostTemplateData = {};
  if (typeof content === "string") {
    existingData = extractTemplateData(content);
  } else if (typeof content === "object" && content !== null) {
    // Extract from TipTap JSON
    if (content.type === "doc" && Array.isArray(content.content)) {
      content.content.forEach((node: any) => {
        if (node.type === "templateSeries") {
          existingData.seriesName = node.attrs?.seriesName;
          existingData.volume = node.attrs?.volume;
        } else if (node.type === "templateTitle") {
          existingData.title = node.attrs?.title;
        } else if (node.type === "templateSubtitle") {
          existingData.subtitle = node.attrs?.subtitle;
        } else if (node.type === "templateByline") {
          existingData.authorName = node.attrs?.authorName;
          existingData.date = node.attrs?.date;
        }
      });
    }
  }

  // Generate new template with existing data
  return generatePostTemplate(existingData, createdDate);
}
