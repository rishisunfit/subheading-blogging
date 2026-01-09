"use client";

import { useState } from "react";
import { QuizContactSettings, QuizStyles } from "@/types/quiz";
import { Mail, Phone, User, ArrowRight } from "lucide-react";

interface QuizContactFormProps {
  settings: QuizContactSettings;
  styles: QuizStyles;
  onSubmit: (contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
  }) => void;
  onSkip?: () => void;
}

export function QuizContactForm({
  settings,
  styles,
  onSubmit,
  onSkip,
}: QuizContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getBorderRadius = () => {
    switch (styles.borderRadius) {
      case "none":
        return "0";
      case "small":
        return "0.5rem";
      case "medium":
        return "1rem";
      case "large":
        return "1.5rem";
      case "full":
        return "2rem";
      default:
        return "1rem";
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (
      settings.fields.name?.enabled &&
      settings.fields.name.required &&
      !formData.name.trim()
    ) {
      newErrors.name = "Name is required";
    }

    if (settings.fields.email?.enabled && settings.fields.email.required) {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email";
      }
    }

    if (
      settings.fields.phone?.enabled &&
      settings.fields.phone.required &&
      !formData.phone.trim()
    ) {
      newErrors.phone = "Phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const hasRequiredFields =
    settings.fields.name?.required ||
    settings.fields.email?.required ||
    settings.fields.phone?.required;

  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-12"
      style={{ fontFamily: styles.fontFamily }}
    >
      <div className="w-full max-w-md">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto"
          style={{
            backgroundColor: `${styles.secondaryColor}15`,
            color: styles.secondaryColor,
          }}
        >
          <Mail size={28} />
        </div>

        {/* Title */}
        <h2
          className="text-2xl md:text-3xl font-bold mb-3 text-center"
          style={{ color: styles.textColor }}
        >
          {settings.title || "Get Your Results"}
        </h2>

        {/* Description */}
        {settings.description && (
          <p
            className="text-base md:text-lg mb-8 opacity-70 text-center"
            style={{ color: styles.textColor }}
          >
            {settings.description}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          {settings.fields.name?.enabled && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: styles.textColor }}
              >
                Name{" "}
                {settings.fields.name.required && (
                  <span style={{ color: styles.accentColor }}>*</span>
                )}
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40"
                  style={{ color: styles.textColor }}
                />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Your name"
                  className="w-full pl-12 pr-4 py-4 transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: styles.cardBackgroundColor,
                    borderRadius: getBorderRadius(),
                    border: `2px solid ${
                      errors.name ? "#ef4444" : `${styles.textColor}15`
                    }`,
                    color: styles.textColor,
                    fontFamily: styles.fontFamily,
                  }}
                />
              </div>
              {errors.name && (
                <p className="text-sm mt-1 text-red-500">{errors.name}</p>
              )}
            </div>
          )}

          {/* Email Field */}
          {settings.fields.email?.enabled && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: styles.textColor }}
              >
                Email{" "}
                {settings.fields.email.required && (
                  <span style={{ color: styles.accentColor }}>*</span>
                )}
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40"
                  style={{ color: styles.textColor }}
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-4 transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: styles.cardBackgroundColor,
                    borderRadius: getBorderRadius(),
                    border: `2px solid ${
                      errors.email ? "#ef4444" : `${styles.textColor}15`
                    }`,
                    color: styles.textColor,
                    fontFamily: styles.fontFamily,
                  }}
                />
              </div>
              {errors.email && (
                <p className="text-sm mt-1 text-red-500">{errors.email}</p>
              )}
            </div>
          )}

          {/* Phone Field */}
          {settings.fields.phone?.enabled && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: styles.textColor }}
              >
                Phone{" "}
                {settings.fields.phone.required && (
                  <span style={{ color: styles.accentColor }}>*</span>
                )}
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40"
                  style={{ color: styles.textColor }}
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  className="w-full pl-12 pr-4 py-4 transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: styles.cardBackgroundColor,
                    borderRadius: getBorderRadius(),
                    border: `2px solid ${
                      errors.phone ? "#ef4444" : `${styles.textColor}15`
                    }`,
                    color: styles.textColor,
                    fontFamily: styles.fontFamily,
                  }}
                />
              </div>
              {errors.phone && (
                <p className="text-sm mt-1 text-red-500">{errors.phone}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full px-6 py-4 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 mt-6 hover:opacity-90"
            style={{
              backgroundColor: styles.primaryColor,
              color: "#ffffff",
              borderRadius: getBorderRadius(),
            }}
          >
            See My Results
            <ArrowRight size={18} />
          </button>

          {/* Skip Button */}
          {!hasRequiredFields && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full px-6 py-3 text-sm font-medium transition-all duration-200 opacity-60 hover:opacity-100"
              style={{ color: styles.textColor }}
            >
              Skip for now
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
