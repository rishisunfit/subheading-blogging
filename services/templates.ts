// Local storage-based templates (will refactor to Supabase later)

export interface Template {
  id: string;
  name: string;
  content: string;
  styles: TemplateStyles;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface TemplateStyles {
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
  primaryTextColor: string;
  secondaryColor: string;
  linkColor: string;
  headingFont: string;
  headingWeight: string;
  bodyFont: string;
  bodyWeight: string;
}

export interface CreateTemplateData {
  name: string;
  content: string;
  styles: TemplateStyles;
}

export interface UpdateTemplateData {
  name?: string;
  content?: string;
  styles?: TemplateStyles;
}

export const defaultStyles: TemplateStyles = {
  backgroundColor: "#FFFFFF",
  textColor: "#000000",
  primaryColor: "#DB2777",
  primaryTextColor: "#FFFFFF",
  secondaryColor: "#6B7280",
  linkColor: "#4746E5",
  headingFont: "PT Serif",
  headingWeight: "700",
  bodyFont: "Georgia",
  bodyWeight: "400",
};

const STORAGE_KEY = "blogish_templates";

// Helper to generate UUID
const generateId = (): string => {
  return (
    crypto.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );
};

// Helper to get templates from localStorage
const getStoredTemplates = (): Template[] => {
  if (typeof window === "undefined") {
    console.warn("Cannot get templates: window is undefined (SSR)");
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("No templates found in localStorage");
      return [];
    }
    const parsed = JSON.parse(stored);
    console.log(`Loaded ${parsed.length} templates from localStorage`);
    return parsed;
  } catch (error) {
    console.error("Error reading templates from localStorage:", error);
    // If corrupted, return empty array
    return [];
  }
};

// Helper to save templates to localStorage
const saveTemplates = (templates: Template[]): void => {
  if (typeof window === "undefined") {
    console.warn("Cannot save templates: window is undefined (SSR)");
    return;
  }

  try {
    const serialized = JSON.stringify(templates);
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log(`Saved ${templates.length} templates to localStorage`);
  } catch (error) {
    console.error("Error saving templates to localStorage:", error);
    // Check if it's a quota exceeded error
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error(
        "Storage quota exceeded. Please clear some space and try again."
      );
    }
    throw error;
  }
};

export const templatesApi = {
  async getAll(): Promise<Template[]> {
    return getStoredTemplates();
  },

  async getById(id: string): Promise<Template> {
    const templates = getStoredTemplates();
    const template = templates.find((t) => t.id === id);
    if (!template) {
      throw new Error("Template not found");
    }
    return template;
  },

  async create(templateData: CreateTemplateData): Promise<Template> {
    const templates = getStoredTemplates();
    const now = new Date().toISOString();

    const newTemplate: Template = {
      id: generateId(),
      ...templateData,
      user_id: "local-user",
      created_at: now,
      updated_at: now,
    };

    templates.unshift(newTemplate); // Add to beginning
    saveTemplates(templates);

    return newTemplate;
  },

  async update(
    id: string,
    templateData: UpdateTemplateData
  ): Promise<Template> {
    const templates = getStoredTemplates();
    const index = templates.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new Error("Template not found");
    }

    const updatedTemplate: Template = {
      ...templates[index],
      ...templateData,
      updated_at: new Date().toISOString(),
    };

    templates[index] = updatedTemplate;
    saveTemplates(templates);

    return updatedTemplate;
  },

  async delete(id: string): Promise<void> {
    const templates = getStoredTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    saveTemplates(filtered);
  },
};
